import nltk
from django.core.checks import Error, register

NLTK_PACKAGES = {
    'punkt_tab': 'tokenizers/punkt_tab/english/',
    'averaged_perceptron_tagger_eng': 'taggers/averaged_perceptron_tagger_eng/',
}


@register()
def nltk_data_is_installed(app_configs, **kwargs):
    missing = []
    for package, path in NLTK_PACKAGES.items():
        try:
            nltk.data.find(path)
        except LookupError:
            missing.append(package)
    if not missing:
        return []
    return [Error(
        f"NLTK data is missing: {', '.join(missing)}",
        hint=f"Run: python -m nltk.downloader {' '.join(missing)}",
        id='stylometry.E001',
    )]
