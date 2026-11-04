# Blog Authorship Corpus: https://www.kaggle.com/rtatman/blog-authorship-corpus
#
# The corpus may be freely used for non-commercial research purposes. Any resulting
# publications should cite the following:
#
# J. Schler, M. Koppel, S. Argamon and J. Pennebaker (2006). Effects of Age and Gender on
# Blogging in Proceedings of 2006 AAAI Spring Symposium on Computational Approaches for
# Analyzing Weblogs. URL: http://www.cs.biu.ac.il/~schlerj/schler_springsymp06.pdf
#
# Columns: id, gender, age, topic, sign, date, text

import csv
from collections import defaultdict
from itertools import islice

from ._base import ImportCommand


class Command(ImportCommand):
    help = 'Import blog posts from the Blog Authorship Corpus CSV.'
    source_help = 'Path to blogs.csv'
    limit_help = 'Maximum number of CSV rows to read'
    default_limit = 1998

    def run_import(self, source, limit):
        created = 0
        posts_per_author = defaultdict(int)
        with open(source, encoding='utf8') as csv_file:
            rows = csv.reader(csv_file)
            next(rows, None)  # header
            for row in islice(rows, limit):
                name, text = row[0], row[6]
                author = self.find_author(name)
                if author is None:
                    continue
                posts_per_author[name] += 1
                self.add_document(author, f'{name} {posts_per_author[name]}', text)
                created += 1
        return created
