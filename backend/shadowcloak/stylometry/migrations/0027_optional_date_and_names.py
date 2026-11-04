import datetime

import django.db.models.functions.text
from django.conf import settings
from django.db import migrations, models

# The form and the importers used to fill this in when nobody knew the real date.
PLACEHOLDER_DATE = datetime.date(2002, 2, 20)


def clear_placeholder_dates(apps, schema_editor):
    apps.get_model('stylometry', 'Document').objects.filter(publication_date=PLACEHOLDER_DATE).update(publication_date=None)


class Migration(migrations.Migration):

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ('stylometry', '0026_document_token_counts'),
    ]

    operations = [
        migrations.RemoveField(model_name='document', name='active'),
        migrations.AlterField(
            model_name='document',
            name='publication_date',
            field=models.DateField(blank=True, null=True),
        ),
        migrations.RunPython(clear_placeholder_dates, migrations.RunPython.noop),
        migrations.AlterUniqueTogether(name='author', unique_together=set()),
        migrations.AlterUniqueTogether(name='group', unique_together=set()),
        migrations.AddConstraint(
            model_name='author',
            constraint=models.UniqueConstraint(django.db.models.functions.text.Lower('name'), models.F('user'), name='author_name_unique_per_user'),
        ),
        migrations.AddConstraint(
            model_name='group',
            constraint=models.UniqueConstraint(django.db.models.functions.text.Lower('name'), models.F('user'), name='group_name_unique_per_user'),
        ),
    ]
