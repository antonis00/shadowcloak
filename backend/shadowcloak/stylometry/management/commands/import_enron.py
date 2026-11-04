# Enron Email Dataset: https://www.cs.cmu.edu/~enron/
# Reader: https://pypi.org/project/enron_reader/

from django.core.management.base import CommandError

from ._base import ImportCommand

MAIL_SENDERS = [
    'allen-p', 'bass-e', 'buy-r', 'campbell-l', 'cuilla-m', 'dasovich-j', 'davis-d',
    'delainey-d', 'derrick-j', 'donohoe-t', 'fossum-d', 'gay-r', 'haedicke-m', 'hodge-j',
    'kean-s', 'keavey-p', 'king-j', 'lavorato-j', 'may-l', 'mcconnell-m', 'mckay-b',
    'mclaughlin-e', 'neal-s', 'quenet-j', 'rogers-b', 'sager-e', 'scott-s', 'shively-h',
    'tholt-j', 'townsend-j', 'weldon-c', 'whalley-g', 'white-s',
]


class Command(ImportCommand):
    help = "Import each sender's sent emails from the Enron maildir, skipping replies and forwards."
    source_help = 'Path to the Enron maildir folder'
    limit_help = 'Maximum number of sent messages to read per sender, including replies and forwards'
    default_limit = 100

    def run_import(self, source, limit):
        try:
            from enron_reader import EnronReader
        except ImportError:
            raise CommandError('This command needs the enron_reader package: pip install enron_reader')

        reader = EnronReader(source)
        created = 0
        for sender in MAIL_SENDERS:
            name = sender.replace('-', ' ').lower()
            author = self.find_author(name)
            if author is None:
                self.stderr.write(f'Skipping {sender}: no author named "{name}".')
                continue

            mailbox = reader.get_mailbox_for_user(sender)
            sent = next((f for f in mailbox.root_folder.subfolders if f.name == 'sent'), None)
            if sent is None:
                continue

            index = 1
            for message in sent.messages[:limit]:
                if message.subject.lower().startswith(('re:', 'fw:')):
                    continue
                self.add_document(author, f'{message.subject} ({name} {index})', str(message.plaintext))
                index += 1
                created += 1
        return created
