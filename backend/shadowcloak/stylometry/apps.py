from django.apps import AppConfig


class StylometryConfig(AppConfig):
    name = 'stylometry'

    def ready(self):
        from stylometry import checks  # noqa: F401  Importing it registers the check.
