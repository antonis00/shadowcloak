from rest_framework.authentication import SessionAuthentication


class SessionAuth(SessionAuthentication):
    """Answers 401 when nobody is logged in, where DRF's class answers 403.

    The frontend can then tell "log in again" apart from a real 403, such as a failed CSRF check.
    """

    def authenticate_header(self, request):
        return 'Session'
