from rest_framework.throttling import SimpleRateThrottle


class LoginAccountThrottle(SimpleRateThrottle):
    """Limits guesses at one account, however many addresses they come from."""
    scope = 'login_account'

    def get_cache_key(self, request, view):
        username = request.data.get('username')
        if not isinstance(username, str):
            return None
        return self.cache_format % {'scope': self.scope, 'ident': username.lower()[:150]}
