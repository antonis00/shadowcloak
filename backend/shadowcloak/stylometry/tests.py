import csv
import os
import tempfile
from io import StringIO

from django.contrib.auth.models import User
from django.core.management import call_command
from django.test import TestCase
from rest_framework.test import APIClient

from stylometry.models import Author, Document, Group

PASSWORD = 'correct-horse-battery'


def register(client, username='alice', password1=PASSWORD, password2=PASSWORD):
    return client.post(
        '/api/auth/register/',
        {'username': username, 'password1': password1, 'password2': password2},
        format='json',
    )


class RegisterTests(TestCase):
    def setUp(self):
        self.client = APIClient()

    def test_creates_a_user_without_an_email(self):
        response = register(self.client)
        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.data, {'username': 'alice'})
        self.assertEqual(User.objects.get(username='alice').email, '')

    def test_ignores_a_submitted_email(self):
        self.client.post(
            '/api/auth/register/',
            {'username': 'alice', 'email': 'a@example.com', 'password1': PASSWORD, 'password2': PASSWORD},
            format='json',
        )
        self.assertEqual(User.objects.get(username='alice').email, '')

    def test_rejects_a_weak_password(self):
        response = register(self.client, password1='abcd', password2='abcd')
        self.assertEqual(response.status_code, 400)
        self.assertIn('password1', response.data)

    def test_rejects_a_password_similar_to_the_username(self):
        response = register(self.client, username='wonderland', password1='wonderland1', password2='wonderland1')
        self.assertEqual(response.status_code, 400)

    def test_rejects_mismatched_passwords(self):
        response = register(self.client, password2='something-else-entirely')
        self.assertEqual(response.status_code, 400)
        self.assertIn('password2', response.data)

    def test_rejects_a_duplicate_username(self):
        register(self.client)
        self.assertEqual(register(self.client).status_code, 400)

    def test_does_not_return_a_credential(self):
        response = register(self.client)
        self.assertNotIn('key', response.data)
        self.assertNotIn('sessionid', response.cookies)


class SessionTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        User.objects.create_user('alice', password=PASSWORD)

    def login(self, password=PASSWORD):
        return self.client.post('/api/auth/login/', {'username': 'alice', 'password': password}, format='json')

    def test_login_sets_an_http_only_session_cookie(self):
        response = self.login()
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data, {'username': 'alice'})
        self.assertTrue(response.cookies['sessionid']['httponly'])
        self.assertEqual(response.cookies['sessionid']['samesite'], 'Lax')

    def test_login_body_contains_no_token(self):
        self.assertEqual(set(self.login().data), {'username'})

    def test_wrong_password_gives_the_same_error_as_an_unknown_user(self):
        wrong = self.login('wrong')
        unknown = self.client.post('/api/auth/login/', {'username': 'nobody', 'password': 'x'}, format='json')
        self.assertEqual(wrong.status_code, 400)
        self.assertEqual(wrong.data, unknown.data)

    def test_login_requires_both_fields(self):
        self.assertEqual(self.client.post('/api/auth/login/', {}, format='json').status_code, 400)

    def test_me_reports_the_logged_in_user(self):
        self.assertEqual(self.client.get('/api/auth/me/').data, {'username': None})
        self.login()
        self.assertEqual(self.client.get('/api/auth/me/').data, {'username': 'alice'})

    def test_me_sets_the_csrf_cookie(self):
        self.assertIn('csrftoken', self.client.get('/api/auth/me/').cookies)

    def test_protected_routes_answer_401_when_logged_out(self):
        for path in ('/api/authors/', '/api/documents/', '/api/groups/', '/api/docsbyauthor/'):
            self.assertEqual(self.client.get(path).status_code, 401, path)

    def test_session_gives_access_to_protected_routes(self):
        self.login()
        self.assertEqual(self.client.get('/api/authors/').status_code, 200)

    def test_logout_ends_the_session_on_the_server(self):
        self.login()
        stolen = self.client.cookies['sessionid'].value
        self.assertEqual(self.client.post('/api/auth/logout/').status_code, 204)
        replay = APIClient()
        replay.cookies['sessionid'] = stolen
        self.assertEqual(replay.get('/api/authors/').status_code, 401)

    def test_logout_requires_a_session(self):
        self.assertEqual(self.client.post('/api/auth/logout/').status_code, 401)


class CsrfTests(TestCase):
    """The default test client skips CSRF checks, so these turn them on."""

    def setUp(self):
        self.client = APIClient(enforce_csrf_checks=True)
        User.objects.create_user('alice', password=PASSWORD)

    def csrf_header(self):
        return {'HTTP_X_CSRFTOKEN': self.client.cookies['csrftoken'].value}

    def login(self):
        self.client.get('/api/auth/me/')
        return self.client.post(
            '/api/auth/login/', {'username': 'alice', 'password': PASSWORD}, format='json', **self.csrf_header()
        )

    def test_login_is_rejected_without_a_token(self):
        response = self.client.post('/api/auth/login/', {'username': 'alice', 'password': PASSWORD}, format='json')
        self.assertEqual(response.status_code, 403)

    def test_register_is_rejected_without_a_token(self):
        self.assertEqual(register(self.client, username='bob').status_code, 403)

    def test_login_works_with_a_token(self):
        self.assertEqual(self.login().status_code, 200)

    def test_writes_are_rejected_without_a_token(self):
        self.login()
        response = self.client.post('/api/authors/', {'name': 'x'}, format='json')
        self.assertEqual(response.status_code, 403)

    def test_writes_work_with_a_token(self):
        self.login()
        response = self.client.post('/api/authors/', {'name': 'x'}, format='json', **self.csrf_header())
        self.assertEqual(response.status_code, 201)

    def test_logout_is_rejected_without_a_token(self):
        self.login()
        self.assertEqual(self.client.post('/api/auth/logout/').status_code, 403)


class RemovedAuthTests(TestCase):
    def test_old_auth_routes_are_gone(self):
        client = APIClient()
        for path in (
            '/api/token/', '/api/token/refresh/', '/api/custom/registration/',
            '/api/rest-auth/login/', '/api/rest-auth/registration/', '/api-auth/login/',
        ):
            self.assertEqual(client.post(path, {}, format='json').status_code, 404, path)

    def test_bearer_and_token_headers_grant_nothing(self):
        for header in ('Bearer anything', 'Token anything', 'Bearer null'):
            client = APIClient()
            client.credentials(HTTP_AUTHORIZATION=header)
            self.assertEqual(client.get('/api/authors/').status_code, 401, header)


class DocumentOwnershipTests(TestCase):
    """A document can only point at an author and a group its user owns."""

    def setUp(self):
        self.alice = User.objects.create_user('alice', password=PASSWORD)
        self.bob = User.objects.create_user('bob', password=PASSWORD)
        self.alice_author = Author.objects.create(user=self.alice, name='alice author')
        self.alice_group = Group.objects.create(user=self.alice, name='alice group')
        self.bob_author = Author.objects.create(user=self.bob, name='secret source of bob')
        self.bob_group = Group.objects.create(user=self.bob, name='bob group')
        self.document = Document.objects.create(
            author=self.alice_author, group=self.alice_group, title='mine', body='my text', publication_date='2002-02-20'
        )
        self.client = APIClient()
        self.client.force_authenticate(self.alice)

    def payload(self, **overrides):
        return {
            'author': self.alice_author.pk,
            'group': self.alice_group.pk,
            'title': 'new',
            'body': 'attacker text',
            'publication_date': '2002-02-20',
            'active': True,
            **overrides,
        }

    def assert_rejected(self, response, field):
        self.assertEqual(response.status_code, 400)
        self.assertIn(field, response.data)

    def test_create_with_own_author_and_group_works(self):
        self.assertEqual(self.client.post('/api/documents/', self.payload(), format='json').status_code, 201)

    def test_update_with_own_author_and_group_works(self):
        url = f'/api/documents/{self.document.pk}/'
        self.assertEqual(self.client.put(url, self.payload(), format='json').status_code, 200)

    def test_create_with_another_users_author_is_rejected(self):
        response = self.client.post('/api/documents/', self.payload(author=self.bob_author.pk), format='json')
        self.assert_rejected(response, 'author')
        self.assertFalse(Document.objects.filter(author=self.bob_author).exists())

    def test_create_with_another_users_group_is_rejected(self):
        response = self.client.post('/api/documents/', self.payload(group=self.bob_group.pk), format='json')
        self.assert_rejected(response, 'group')
        self.assertFalse(Document.objects.filter(group=self.bob_group).exists())

    def test_put_cannot_move_a_document_to_another_user(self):
        url = f'/api/documents/{self.document.pk}/'
        payload = self.payload(author=self.bob_author.pk, group=self.bob_group.pk)
        self.assert_rejected(self.client.put(url, payload, format='json'), 'author')
        self.document.refresh_from_db()
        self.assertEqual(self.document.author, self.alice_author)
        self.assertEqual(self.document.group, self.alice_group)

    def test_patch_cannot_move_a_document_to_another_users_author(self):
        url = f'/api/documents/{self.document.pk}/'
        self.assert_rejected(self.client.patch(url, {'author': self.bob_author.pk}, format='json'), 'author')
        self.document.refresh_from_db()
        self.assertEqual(self.document.author, self.alice_author)

    def test_patch_cannot_move_a_document_to_another_users_group(self):
        url = f'/api/documents/{self.document.pk}/'
        self.assert_rejected(self.client.patch(url, {'group': self.bob_group.pk}, format='json'), 'group')
        self.document.refresh_from_db()
        self.assertEqual(self.document.group, self.alice_group)

    def test_error_does_not_reveal_another_users_author_name(self):
        response = self.client.post('/api/documents/', self.payload(author=self.bob_author.pk), format='json')
        self.assertNotIn('secret source of bob', str(response.data))

    def test_another_users_id_looks_the_same_as_a_missing_id(self):
        missing = 999999
        foreign = self.client.post('/api/documents/', self.payload(author=self.bob_author.pk), format='json')
        absent = self.client.post('/api/documents/', self.payload(author=missing), format='json')
        self.assertEqual(foreign.status_code, absent.status_code)
        self.assertEqual(
            str(foreign.data['author'][0]).replace(str(self.bob_author.pk), 'N'),
            str(absent.data['author'][0]).replace(str(missing), 'N'),
        )

    def test_documents_by_author_still_lists_documents(self):
        response = self.client.get(f'/api/docsbyauthor/?group={self.alice_group.pk}')
        self.assertEqual(response.status_code, 200)
        self.assertEqual([d['title'] for d in response.data[0]['documents']], ['mine'])


class ImportOwnershipTests(TestCase):
    """Imported documents only ever attach to authors owned by the target group's user."""

    def setUp(self):
        self.alice = User.objects.create_user('alice', password=PASSWORD)
        self.bob = User.objects.create_user('bob', password=PASSWORD)
        self.group = Group.objects.create(user=self.alice, name='alice group')

    def csv_file(self, rows):
        handle = tempfile.NamedTemporaryFile('w', suffix='.csv', newline='', encoding='utf8', delete=False)
        self.addCleanup(os.unlink, handle.name)
        with handle:
            csv.writer(handle).writerows(rows)
        return handle.name

    def import_blogs(self, author_name):
        rows = [['id', 'gender', 'age', 'topic', 'sign', 'date', 'text'], [author_name, 'f', '30', 't', 's', 'd', 'a post']]
        call_command('import_blogs', self.csv_file(rows), group=self.group.pk, stdout=StringIO())

    def import_tweet(self, author_name):
        row = ['1', '', '', '', '', '', '', author_name, '', '', 'a tweet']
        call_command('import_tweets', self.csv_file([['header'] * 11, row]), group=self.group.pk, stdout=StringIO())

    def test_same_name_goes_to_the_group_owners_author(self):
        bobs = Author.objects.create(user=self.bob, name='shared name')
        alices = Author.objects.create(user=self.alice, name='shared name')
        self.import_blogs('shared name')
        self.assertEqual(alices.documents.count(), 1)
        self.assertEqual(bobs.documents.count(), 0)

    def test_another_users_author_is_never_used(self):
        bobs = Author.objects.create(user=self.bob, name='only bob has this')
        self.import_blogs('only bob has this')
        self.assertEqual(bobs.documents.count(), 0)
        self.assertEqual(Document.objects.count(), 0)

    def test_tweets_use_the_group_owners_author_too(self):
        bobs = Author.objects.create(user=self.bob, name='shared name')
        alices = Author.objects.create(user=self.alice, name='shared name')
        self.import_tweet('shared name')
        self.assertEqual(alices.documents.count(), 1)
        self.assertEqual(bobs.documents.count(), 0)

    def test_author_names_match_regardless_of_case(self):
        alices = Author.objects.create(user=self.alice, name='jetbluefan')
        self.import_tweet('JetBlueFan')
        self.assertEqual(alices.documents.count(), 1)
