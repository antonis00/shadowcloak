from datetime import date

from django.core.management.base import BaseCommand, CommandError
from django.db import IntegrityError, transaction

from stylometry.models import Author, Document, Group

# The datasets have no usable publication dates, so every document gets this one.
PUBLICATION_DATE = date(2002, 2, 20)


class ImportCommand(BaseCommand):
    """Shared options and database handling for the dataset imports.

    Each import runs in one transaction, so a failure leaves the database unchanged.
    Authors must already exist and belong to the group's owner. Names match regardless
    of case. Documents from unknown authors are skipped.
    """

    source_help = ''
    limit_help = ''
    default_limit = None

    def add_arguments(self, parser):
        parser.add_argument('source', help=self.source_help)
        parser.add_argument('--group', type=int, required=True, help='ID of the group to add documents to')
        parser.add_argument('--limit', type=int, default=self.default_limit, help=self.limit_help)

    def handle(self, *args, **options):
        try:
            self.group = Group.objects.get(pk=options['group'])
        except Group.DoesNotExist:
            raise CommandError(f"Group {options['group']} does not exist.")

        try:
            with transaction.atomic():
                created = self.run_import(options['source'], options['limit'])
        except OSError as error:
            raise CommandError(f"Could not read {options['source']}: {error}")
        except IntegrityError as error:
            raise CommandError(f'Nothing was imported, this data may already be imported: {error}')

        self.stdout.write(self.style.SUCCESS(f'Imported {created} documents into group {self.group.pk}.'))

    def run_import(self, source, limit):
        raise NotImplementedError

    def find_author(self, name):
        return Author.objects.filter(user=self.group.user, name__iexact=name).first()

    def add_document(self, author, title, body):
        Document.objects.create(
            author=author,
            group=self.group,
            title=title,
            body=body,
            publication_date=PUBLICATION_DATE,
        )
