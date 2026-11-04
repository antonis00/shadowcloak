from collections import Counter

import nltk
from django.db import migrations, models


def fill_token_counts(apps, schema_editor):
    # A copy of the tokenising rule as it stands today, because a migration shouldn't change later.
    Document = apps.get_model('stylometry', 'Document')
    for document in Document.objects.only('body').iterator(chunk_size=100):
        tokens = [token.lower() for token in nltk.word_tokenize(document.body) if any(c.isalpha() for c in token)]
        document.token_counts = dict(Counter(tokens))
        document.save(update_fields=['token_counts'])


class Migration(migrations.Migration):

    dependencies = [
        ('stylometry', '0025_auto_20210118_1450'),
    ]

    operations = [
        migrations.AddField(
            model_name='document',
            name='token_counts',
            field=models.JSONField(default=dict, editable=False),
        ),
        migrations.RunPython(fill_token_counts, migrations.RunPython.noop),
    ]
