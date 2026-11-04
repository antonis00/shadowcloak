import csv
import importlib
import os
import subprocess
import sys
import tempfile
from io import StringIO
from unittest.mock import patch

from django.apps import apps as django_apps
from django.conf import settings
from django.contrib.auth.models import User
from django.core.cache import cache
from django.core.management import call_command
from django.test import SimpleTestCase, TestCase as DjangoTestCase, override_settings
from rest_framework.test import APIClient

from stylometry import engine
from stylometry.api import serializers, views
from stylometry.checks import nltk_data_is_installed
from stylometry.models import Author, Document, Group

PASSWORD = 'correct-horse-battery'


@override_settings(SECURE_SSL_REDIRECT=False, PASSWORD_HASHERS=['django.contrib.auth.hashers.MD5PasswordHasher'])
class TestCase(DjangoTestCase):
    """Plain HTTP and fast hashing suit the test client, and rate limits must not carry over."""

    def run(self, result=None):
        cache.clear()
        return super().run(result)


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


def counts_of(texts):
    return {author: engine.count_tokens(text) for author, text in texts.items()}


def find_author(texts, text):
    return engine.find_author(counts_of(texts), text)


def analyse(texts, text):
    return engine.analyse(counts_of(texts), text)


class EngineTests(SimpleTestCase):
    SARAH = 'the cat sat on the mat and the dog ran to the house of the old man ' * 20
    JOHN = 'a bird flew over a hill while a fox hid in a den by a river near a farm ' * 20

    def test_finds_the_closer_author(self):
        texts = {'sarah': self.SARAH, 'john': self.JOHN}
        self.assertEqual(find_author(texts, 'the cat and the dog ran to the old house'), 'sarah')
        self.assertEqual(find_author(texts, 'a fox and a bird hid by a farm near a hill'), 'john')

    def test_both_functions_agree(self):
        texts = {'sarah': self.SARAH, 'john': self.JOHN}
        text = 'the cat and the dog ran to the old house'
        self.assertEqual(analyse(texts, text)['mostProbableAuthor'], find_author(texts, text))

    def test_text_without_words_is_a_clear_error(self):
        texts = {'sarah': self.SARAH, 'john': self.JOHN}
        for text in ['', '12345 678', '!!! ... ???']:
            for run in (find_author, analyse):
                with self.assertRaisesMessage(engine.EngineError, 'no words'):
                    run(texts, text)

    def test_identical_authors_are_a_clear_error(self):
        with self.assertRaisesMessage(engine.EngineError, "can't be told apart"):
            find_author({'sarah': self.SARAH, 'john': self.SARAH}, 'the cat')

    def test_a_word_shared_at_the_same_rate_is_ignored(self):
        texts = {'sarah': 'shared red red blue', 'john': 'shared green green green'}
        statistics, _ = engine.build_profile(counts_of(texts))
        self.assertNotIn('shared', statistics)
        self.assertEqual(find_author(texts, 'red blue red'), 'sarah')

    def test_an_author_without_words_is_left_out(self):
        texts = {'sarah': self.SARAH, 'john': self.JOHN, 'numbers': '123 456'}
        self.assertNotEqual(find_author(texts, 'the cat sat'), 'numbers')

    def test_too_few_authors_with_words_is_a_clear_error(self):
        for texts in [{}, {'sarah': self.SARAH}, {'sarah': self.SARAH, 'numbers': '123'}]:
            with self.assertRaisesMessage(engine.EngineError, 'at least two authors'):
                find_author(texts, 'the cat')

    def test_text_sharing_no_common_words_still_gets_an_answer(self):
        result = analyse({'sarah': self.SARAH, 'john': self.JOHN}, 'zebra quokka')
        self.assertIn(result['mostProbableAuthor'], ['sarah', 'john'])
        self.assertEqual(result['tokensSignificantToAttribution'], [])

    def test_analysis_response_has_what_the_page_uses(self):
        result = analyse({'sarah': self.SARAH, 'john': self.JOHN}, 'The cat and the dog.')
        self.assertEqual(set(result), {'mostProbableAuthor', 'tokensSignificantToAttribution'})
        self.assertEqual(set(result['tokensSignificantToAttribution'][0]), {'token', 'partOfSpeech', 'score'})

    def test_ties_between_words_do_not_depend_on_stored_order(self):
        forwards = {'sarah': {'red': 2, 'blue': 2, 'pink': 1}, 'john': {'red': 1, 'blue': 1, 'pink': 3}}
        backwards = {author: dict(reversed(list(count.items()))) for author, count in forwards.items()}
        with patch.object(engine, 'FEATURE_COUNT', 2):
            self.assertEqual(list(engine.build_profile(forwards)[0]), list(engine.build_profile(backwards)[0]))


class AttributionApiTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user('alice', password=PASSWORD)
        self.other = User.objects.create_user('bob', password=PASSWORD)
        self.group = Group.objects.create(user=self.user, name='books')
        self.client = APIClient()
        self.client.force_authenticate(self.user)

    def add_document(self, author_name, body, group=None, title='one'):
        group = group or self.group
        author, _ = Author.objects.get_or_create(user=group.user, name=author_name)
        return Document.objects.create(author=author, group=group, title=title, body=body,
                                       publication_date='2002-02-20')

    def add_two_authors(self):
        self.add_document('sarah', EngineTests.SARAH)
        self.add_document('john', EngineTests.JOHN)

    def post(self, url, **payload):
        return self.client.post(url, payload, format='json')

    def both(self, **payload):
        return [self.post('/api/findauthor/', **payload), self.post('/api/analyse/', **payload)]

    def test_returns_the_author_name(self):
        self.add_two_authors()
        find, analyse = self.both(group=self.group.id, body='the cat and the dog ran to the old house')
        self.assertEqual(find.status_code, 200)
        self.assertEqual(find.data, 'sarah')
        self.assertEqual(analyse.data['mostProbableAuthor'], 'sarah')

    def test_bad_input_gets_a_400_not_a_crash(self):
        self.add_two_authors()
        cases = [
            {'group': self.group.id, 'body': ''},
            {'group': self.group.id, 'body': '   '},
            {'group': self.group.id, 'body': '12345'},
            {'group': self.group.id, 'body': '!!! ???'},
            {'group': self.group.id},
            {'group': 'abc', 'body': 'the cat'},
            {'body': 'the cat'},
            {'group': self.group.id, 'body': ['a', 'list']},
        ]
        for payload in cases:
            for response in self.both(**payload):
                self.assertEqual(response.status_code, 400, payload)

    def test_too_few_authors_explains_what_to_do(self):
        self.add_document('sarah', EngineTests.SARAH)
        for response in self.both(group=self.group.id, body='the cat'):
            self.assertEqual(response.status_code, 400)
            self.assertIn('at least two authors', response.data['detail'])

    def test_another_users_group_looks_empty(self):
        foreign = Group.objects.create(user=self.other, name='secret')
        self.add_document('x', EngineTests.SARAH, group=foreign)
        self.add_document('y', EngineTests.JOHN, group=foreign)
        for response in self.both(group=foreign.id, body='the cat'):
            self.assertEqual(response.status_code, 400)
            self.assertNotIn('x', response.data['detail'].split())

    def test_text_over_the_limit_is_rejected(self):
        self.add_two_authors()
        for response in self.both(group=self.group.id, body='a' * (serializers.MAX_TEXT_LENGTH + 1)):
            self.assertEqual(response.status_code, 400)

    def test_a_category_over_the_limit_is_rejected_before_any_work(self):
        self.add_two_authors()
        with patch.object(views, 'MAX_CORPUS_LENGTH', 10), patch.object(engine, 'tokenize') as tokenize:
            response = self.post('/api/findauthor/', group=self.group.id, body='the cat')
        self.assertEqual(response.status_code, 400)
        self.assertIn('too much text', response.data['detail'])
        tokenize.assert_not_called()


class LimitTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user('alice', password=PASSWORD)
        self.author = Author.objects.create(user=self.user, name='sarah')
        self.group = Group.objects.create(user=self.user, name='books')
        self.client = APIClient()
        self.client.force_authenticate(self.user)

    def create(self, body):
        return self.client.post('/api/documents/', {
            'author': self.author.id, 'group': self.group.id, 'title': 'one', 'body': body,
            'publication_date': '2002-02-20', 'active': True,
        }, format='json')

    def test_a_document_at_the_limit_is_accepted(self):
        self.assertEqual(self.create('a' * serializers.MAX_DOCUMENT_LENGTH).status_code, 201)

    def test_a_document_over_the_limit_is_rejected(self):
        response = self.create('a' * (serializers.MAX_DOCUMENT_LENGTH + 1))
        self.assertEqual(response.status_code, 400)
        self.assertIn('body', response.data)

    def test_an_oversized_request_is_refused_unread(self):
        with self.settings(DATA_UPLOAD_MAX_MEMORY_SIZE=1000):
            response = self.create('a' * 2000)
        self.assertEqual(response.status_code, 400)
        self.assertFalse(Document.objects.exists())

    def test_only_json_is_accepted(self):
        response = self.client.post('/api/groups/', {'name': 'x'}, format='multipart')
        self.assertEqual(response.status_code, 415)

    def test_a_huge_password_never_reaches_the_hasher(self):
        client = APIClient()
        with patch('stylometry.api.views.authenticate') as authenticate:
            response = client.post('/api/auth/login/', {'username': 'alice', 'password': 'x' * 129}, format='json')
        self.assertEqual(response.status_code, 400)
        authenticate.assert_not_called()


class ThrottleTests(TestCase):
    def login(self, username='alice', address=None, forwarded=None):
        extra = {}
        if address:
            extra['REMOTE_ADDR'] = address
        if forwarded:
            extra['HTTP_X_FORWARDED_FOR'] = forwarded
        return APIClient().post('/api/auth/login/', {'username': username, 'password': 'wrong-password'},
                                format='json', **extra)

    def test_repeated_logins_from_one_address_are_stopped(self):
        codes = [self.login(username=f'user{n}').status_code for n in range(11)]
        self.assertEqual(codes[:10], [400] * 10)
        self.assertEqual(codes[10], 429)

    def test_faking_x_forwarded_for_does_not_escape_the_limit(self):
        codes = [self.login(username=f'user{n}', forwarded=f'10.0.0.{n}').status_code for n in range(11)]
        self.assertEqual(codes[10], 429)

    def test_guesses_at_one_account_are_stopped_across_addresses(self):
        codes = [self.login(address=f'10.0.0.{n}').status_code for n in range(21)]
        self.assertEqual(codes[:20], [400] * 20)
        self.assertEqual(codes[20], 429)

    def test_account_limit_ignores_case(self):
        for n in range(20):
            self.login(username='alice' if n % 2 else 'ALICE', address=f'10.0.0.{n}')
        self.assertEqual(self.login(username='Alice', address='10.0.1.1').status_code, 429)

    def test_a_login_with_a_non_text_username_gets_a_400(self):
        response = APIClient().post('/api/auth/login/', {'username': ['a'], 'password': 'x'}, format='json')
        self.assertEqual(response.status_code, 400)

    def test_registration_is_limited(self):
        codes = [register(APIClient(), username=f'user{n}').status_code for n in range(11)]
        self.assertEqual(codes[:10], [201] * 10)
        self.assertEqual(codes[10], 429)

    def test_attribution_is_limited_per_user(self):
        user = User.objects.create_user('alice', password=PASSWORD)
        group = Group.objects.create(user=user, name='books')
        client = APIClient()
        client.force_authenticate(user)
        payload = {'group': group.id, 'body': 'the cat'}
        codes = [client.post('/api/analyse/', payload, format='json').status_code for _ in range(61)]
        self.assertEqual(codes[:60], [400] * 60)
        self.assertEqual(codes[60], 429)

        other = APIClient()
        other.force_authenticate(User.objects.create_user('bob', password=PASSWORD))
        self.assertEqual(other.post('/api/analyse/', payload, format='json').status_code, 400)


class DocumentsByAuthorTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user('alice', password=PASSWORD)
        self.sarah = Author.objects.create(user=self.user, name='sarah')
        self.john = Author.objects.create(user=self.user, name='john')
        self.books = Group.objects.create(user=self.user, name='books')
        self.posts = Group.objects.create(user=self.user, name='posts')
        for author, group, title in [(self.sarah, self.books, 'a book'), (self.sarah, self.posts, 'a post'),
                                     (self.john, self.posts, 'his post')]:
            Document.objects.create(author=author, group=group, title=title, body='words',
                                    publication_date='2002-02-20')
        self.client = APIClient()
        self.client.force_authenticate(self.user)

    def get(self, query=''):
        return self.client.get('/api/docsbyauthor/' + query)

    def titles(self, query=''):
        return {author['name']: [d['title'] for d in author['documents']] for author in self.get(query).data}

    def test_group_filter_applies_to_the_nested_documents(self):
        self.assertEqual(self.titles(f'?group={self.books.id}'), {'sarah': ['a book']})
        self.assertEqual(self.titles(f'?group={self.posts.id}'), {'sarah': ['a post'], 'john': ['his post']})

    def test_author_filter_alone_works(self):
        response = self.get(f'?author={self.john.id}')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(self.titles(f'?author={self.sarah.id}'), {'sarah': ['a book']})

    def test_both_filters_together(self):
        self.assertEqual(self.titles(f'?group={self.posts.id}&author={self.john.id}'), {'john': ['his post']})
        self.assertEqual(self.titles(f'?group={self.posts.id}&author={self.sarah.id},{self.john.id}'),
                         {'sarah': ['a post'], 'john': ['his post']})

    def test_no_filter_uses_the_first_group(self):
        self.assertEqual(self.titles(), {'sarah': ['a book']})

    def test_bad_filters_get_a_clear_answer(self):
        self.assertEqual(self.get('?group=abc').status_code, 404)
        self.assertEqual(self.get('?group=99999').status_code, 404)
        self.assertEqual(self.get('?author=abc').status_code, 400)

    def test_another_users_group_looks_missing(self):
        foreign = Group.objects.create(user=User.objects.create_user('bob', password=PASSWORD), name='x')
        self.assertEqual(self.get(f'?group={foreign.id}').status_code, 404)

    def test_another_users_author_returns_nothing(self):
        bob = User.objects.create_user('bob', password=PASSWORD)
        foreign = Author.objects.create(user=bob, name='secret')
        self.assertEqual(self.titles(f'?group={self.books.id}&author={foreign.id}'), {})

    def test_a_new_user_gets_an_empty_list(self):
        client = APIClient()
        client.force_authenticate(User.objects.create_user('new', password=PASSWORD))
        response = client.get('/api/docsbyauthor/')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data, [])

    def test_a_new_users_author_without_documents_is_not_listed(self):
        Author.objects.create(user=self.user, name='empty')
        self.assertNotIn('empty', self.titles(f'?group={self.books.id}'))


class NameTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user('alice', password=PASSWORD)
        self.client = APIClient()
        self.client.force_authenticate(self.user)

    def test_names_are_stored_in_lowercase_on_create_and_update(self):
        for url in ['/api/authors/', '/api/groups/']:
            created = self.client.post(url, {'name': 'MiXeD'}, format='json')
            self.assertEqual(created.status_code, 201)
            self.assertEqual(created.data['name'], 'mixed')
            updated = self.client.put(f"{url}{created.data['id']}/", {'name': 'OtHeR'}, format='json')
            self.assertEqual(updated.status_code, 200)
            self.assertEqual(updated.data['name'], 'other')

    def test_a_duplicate_name_gets_a_400_not_a_crash(self):
        for url in ['/api/authors/', '/api/groups/']:
            self.client.post(url, {'name': 'taken'}, format='json')
            response = self.client.post(url, {'name': 'TAKEN'}, format='json')
            self.assertEqual(response.status_code, 400)
            self.assertIn('name', response.data)

    def test_saving_without_renaming_still_works(self):
        created = self.client.post('/api/authors/', {'name': 'same'}, format='json')
        response = self.client.put(f"/api/authors/{created.data['id']}/", {'name': 'same', 'description': 'x'}, format='json')
        self.assertEqual(response.status_code, 200)

    def test_two_users_can_use_the_same_name(self):
        self.client.post('/api/authors/', {'name': 'shared'}, format='json')
        other = APIClient()
        other.force_authenticate(User.objects.create_user('bob', password=PASSWORD))
        self.assertEqual(other.post('/api/authors/', {'name': 'shared'}, format='json').status_code, 201)

    def test_a_name_that_is_not_text_gets_a_400(self):
        for value in [None, ['a'], {'a': 1}]:
            self.assertEqual(self.client.post('/api/authors/', {'name': value}, format='json').status_code, 400)


class SecureDefaultsTests(TestCase):
    def test_routes_are_private_unless_they_say_otherwise(self):
        client = APIClient()
        for url in ['/api/', '/api/authors/', '/api/groups/', '/api/documents/', '/api/docsbyauthor/']:
            self.assertEqual(client.get(url).status_code, 401, url)
        for url in ['/api/findauthor/', '/api/analyse/', '/api/auth/logout/']:
            self.assertEqual(client.post(url, {}, format='json').status_code, 401, url)

    def test_the_browsable_api_is_gone(self):
        client = APIClient()
        client.force_authenticate(User.objects.create_user('alice', password=PASSWORD))
        response = client.get('/api/authors/', HTTP_ACCEPT='text/html')
        self.assertEqual(response.status_code, 406)

    def test_production_settings_pass_the_deploy_check(self):
        env = {**os.environ, 'DJANGO_SECRET_KEY': 'k' * 30 + 'Zq7!xP2@vL9#mN4$bR6%tY8^', 'DJANGO_DEBUG': 'false',
               'DJANGO_ALLOWED_HOSTS': 'example.com'}
        result = subprocess.run([sys.executable, 'manage.py', 'check', '--deploy', '--fail-level', 'WARNING'],
                                cwd=settings.BASE_DIR, env=env, capture_output=True, text=True)
        self.assertEqual(result.returncode, 0, result.stderr)


class NltkCheckTests(SimpleTestCase):
    def test_passes_when_the_data_is_installed(self):
        self.assertEqual(nltk_data_is_installed(None), [])

    def test_missing_data_says_what_to_run(self):
        with patch('stylometry.checks.nltk.data.find', side_effect=LookupError):
            errors = nltk_data_is_installed(None)
        self.assertEqual(len(errors), 1)
        self.assertIn('python -m nltk.downloader punkt_tab averaged_perceptron_tagger_eng', errors[0].hint)


class TokenCountTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user('alice', password=PASSWORD)
        self.group = Group.objects.create(user=self.user, name='books')
        self.sarah = Author.objects.create(user=self.user, name='sarah')
        self.john = Author.objects.create(user=self.user, name='john')
        self.client = APIClient()
        self.client.force_authenticate(self.user)

    def document(self, author, body, title='one'):
        return Document.objects.create(author=author, group=self.group, title=title, body=body,
                                       publication_date='2002-02-20')

    def test_saving_stores_the_counts(self):
        document = self.document(self.sarah, 'The cat, the dog. 123')
        document.refresh_from_db()
        self.assertEqual(document.token_counts, {'the': 2, 'cat': 1, 'dog': 1})

    def test_editing_through_the_api_updates_the_counts(self):
        document = self.document(self.sarah, 'the cat')
        response = self.client.patch(f'/api/documents/{document.id}/', {'body': 'a dog'}, format='json')
        self.assertEqual(response.status_code, 200)
        document.refresh_from_db()
        self.assertEqual(document.token_counts, {'a': 1, 'dog': 1})

    def test_attribution_does_not_read_the_documents_again(self):
        self.document(self.sarah, EngineTests.SARAH)
        self.document(self.john, EngineTests.JOHN)
        with patch.object(engine, 'tokenize', wraps=engine.tokenize) as tokenize:
            response = self.client.post('/api/findauthor/', {'group': self.group.id, 'body': 'the cat sat'}, format='json')
        self.assertEqual(response.data, 'sarah')
        tokenize.assert_called_once_with('the cat sat')

    def test_an_authors_documents_are_added_together(self):
        self.document(self.sarah, 'the the cat', title='one')
        self.document(self.sarah, 'the dog', title='two')
        self.assertEqual(views.counts_by_author(self.user, self.group.id)['sarah'], {'the': 3, 'cat': 1, 'dog': 1})

    def test_only_the_chosen_categorys_counts_are_used(self):
        other = Group.objects.create(user=self.user, name='posts')
        Document.objects.create(author=self.sarah, group=other, title='post', body='zebra',
                                publication_date='2002-02-20')
        self.document(self.sarah, 'the cat')
        self.assertEqual(views.counts_by_author(self.user, self.group.id)['sarah'], {'the': 1, 'cat': 1})

    def test_counts_never_leave_the_server(self):
        document = self.document(self.sarah, 'the cat')
        for response in [self.client.get('/api/documents/'), self.client.get(f'/api/documents/{document.id}/')]:
            self.assertNotIn('token_counts', str(response.data))
        self.assertNotIn('token_counts', str(self.client.get('/api/docsbyauthor/').data))

    def test_counts_cannot_be_set_from_outside(self):
        document = self.document(self.sarah, 'the cat')
        self.client.patch(f'/api/documents/{document.id}/', {'token_counts': {'forged': 99}}, format='json')
        document.refresh_from_db()
        self.assertNotIn('forged', document.token_counts)

    def test_imports_store_the_counts(self):
        with tempfile.TemporaryDirectory() as folder:
            path = os.path.join(folder, 'blogs.csv')
            with open(path, 'w', newline='', encoding='utf-8') as file:
                writer = csv.writer(file)
                writer.writerow(['id', 'gender', 'age', 'topic', 'sign', 'date', 'text'])
                writer.writerow(['sarah', 'f', '20', 'x', 'y', '1,1,2004', 'the cat sat'])
            call_command('import_blogs', path, group=self.group.id, stdout=StringIO())
        self.assertEqual(Document.objects.get().token_counts, {'the': 1, 'cat': 1, 'sat': 1})

    def test_the_migration_fills_in_existing_documents(self):
        document = self.document(self.sarah, 'the cat')
        Document.objects.filter(pk=document.pk).update(token_counts={})
        migration = importlib.import_module('stylometry.migrations.0026_document_token_counts')
        migration.fill_token_counts(django_apps, None)
        document.refresh_from_db()
        self.assertEqual(document.token_counts, {'the': 1, 'cat': 1})

    def test_document_writes_are_limited(self):
        payload = {'author': self.sarah.id, 'group': self.group.id, 'body': 'the cat',
                   'publication_date': '2002-02-20', 'active': True}
        codes = [self.client.post('/api/documents/', {**payload, 'title': f'd{n}'}, format='json').status_code
                 for n in range(61)]
        self.assertEqual(codes[:60], [201] * 60)
        self.assertEqual(codes[60], 429)
        self.assertEqual(self.client.get('/api/documents/').status_code, 200)
