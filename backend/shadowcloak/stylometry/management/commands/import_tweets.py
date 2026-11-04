# Twitter US Airline Sentiment: https://www.kaggle.com/crowdflower/twitter-airline-sentiment
#
# Uses tweet_id (column 0) as the title, name (column 7) as the author and text (column 10).

import csv
import re
from itertools import islice

from ._base import ImportCommand

MENTION = re.compile(r'[@]\w+[ \$\t\r\n\,\"\.]+')
EMOJI = re.compile(
    "["
    "\U0001F600-\U0001F64F"  # emoticons
    "\U0001F300-\U0001F5FF"  # symbols & pictographs
    "\U0001F680-\U0001F6FF"  # transport & map symbols
    "\U0001F1E0-\U0001F1FF"  # flags
    "\U00002702-\U000027B0"
    "\U000024C2-\U0001F251"
    "\U0001f926-\U0001f937"
    "‍"
    "♀-♂"
    "]+",
    flags=re.UNICODE,
)


def clean(text):
    return EMOJI.sub('', MENTION.sub('', text))


class Command(ImportCommand):
    help = 'Import tweets from the Twitter US Airline Sentiment CSV.'
    source_help = 'Path to the tweets CSV'
    limit_help = 'Maximum number of CSV rows to read'
    default_limit = 1998

    def run_import(self, source, limit):
        created = 0
        with open(source, encoding='utf8') as csv_file:
            rows = csv.reader(csv_file)
            next(rows, None)  # header
            for row in islice(rows, limit):
                author = self.find_author(row[7])
                if author is None:
                    continue
                self.add_document(author, row[0], clean(row[10]))
                created += 1
        return created
