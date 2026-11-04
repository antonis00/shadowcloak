"""The real settings, with a throwaway database and room for the tests' many analyses."""
import os

from shadowcloak.settings import *  # noqa: F403

DATABASES['default']['NAME'] = os.environ['E2E_DATABASE']  # noqa: F405
REST_FRAMEWORK['DEFAULT_THROTTLE_RATES'] = {  # noqa: F405
    **REST_FRAMEWORK['DEFAULT_THROTTLE_RATES'],  # noqa: F405
    'analysis': '600/min',
}
