from django.contrib.auth.models import User
from django.test import TestCase
from rest_framework.test import APIClient

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
