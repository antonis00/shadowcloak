"""Burrows' Delta, with no Django in it, so it can be read and tested on its own.

Each candidate's rate of the corpus's most common words is turned into z-scores. The
candidate whose z-scores are closest on average to the text's is the most likely author.
Candidates are described by their word counts, which come from count_tokens.
"""
import math
from collections import Counter

import nltk

FEATURE_COUNT = 50
SIGNIFICANT_TOKEN_COUNT = 30
# Below this, tests on real books got the author right less than about 60% of the time.
MIN_RELIABLE_WORDS = 500


class EngineError(ValueError):
    """The input can't be analysed. The message is written for the person who supplied it."""


def tokenize(text):
    return [token.lower() for token in nltk.word_tokenize(text) if any(c.isalpha() for c in token)]


def count_tokens(text):
    return dict(Counter(tokenize(text)))


def build_profile(counts_by_author):
    """Works out what the two public functions below share: the features and their z-scores."""
    counts = {author: Counter(count) for author, count in counts_by_author.items()}
    totals = {author: sum(count.values()) for author, count in counts.items()}
    # An author with no words has no rates to compare against.
    authors = [author for author, total in totals.items() if total]
    if len(authors) < 2:
        raise EngineError('This category needs documents with words in them from at least two authors. '
                          'Add more documents or choose another category.')

    corpus = Counter()
    for author in authors:
        corpus.update(counts[author])
    # Ties break alphabetically, so the features don't depend on the order counts were stored in.
    common = sorted(corpus, key=lambda word: (-corpus[word], word))[:FEATURE_COUNT]

    rates = {author: {word: counts[author][word] / totals[author] for word in common} for author in authors}
    statistics = {}
    for word in common:
        values = [rates[author][word] for author in authors]
        mean = sum(values) / len(values)
        spread = math.sqrt(sum((value - mean) ** 2 for value in values) / (len(values) - 1))
        # A word every author uses at the same rate says nothing about who wrote the text.
        if spread:
            statistics[word] = (mean, spread)
    if not statistics:
        raise EngineError("The authors in this category can't be told apart, because they use "
                          'their common words at exactly the same rates.')

    zscores = {author: {word: (rates[author][word] - mean) / spread
                        for word, (mean, spread) in statistics.items()}
               for author in authors}
    return statistics, zscores


def score_text(tokens, statistics):
    if not tokens:
        raise EngineError('The text has no words to analyse.')
    count = Counter(tokens)
    return {word: (count[word] / len(tokens) - mean) / spread for word, (mean, spread) in statistics.items()}


def rank_authors(text_zscores, author_zscores):
    """Every author and their Delta, closest first."""
    def delta(author):
        scores = author_zscores[author]
        return sum(abs(text_zscores[word] - scores[word]) for word in text_zscores) / len(text_zscores)
    deltas = {author: delta(author) for author in author_zscores}
    return [{'author': author, 'delta': deltas[author]} for author in sorted(deltas, key=deltas.get)]


def reliability_warnings(word_count, author_count):
    warnings = []
    if word_count < MIN_RELIABLE_WORDS:
        warnings.append(f'This text has only {word_count} words. Attribution is unreliable below about '
                        f'{MIN_RELIABLE_WORDS}, so treat this result as a rough guess.')
    if author_count == 2:
        warnings.append('With only two authors, the method can\'t weight words by how much authors differ '
                        'on them, which makes this result less reliable.')
    return warnings


def attribution(tokens, statistics, author_zscores):
    text_zscores = score_text(tokens, statistics)
    ranking = rank_authors(text_zscores, author_zscores)
    return text_zscores, {
        'mostProbableAuthor': ranking[0]['author'],
        'ranking': ranking,
        'wordCount': len(tokens),
        'warnings': reliability_warnings(len(tokens), len(ranking)),
    }


def find_author(counts_by_author, text):
    statistics, author_zscores = build_profile(counts_by_author)
    return attribution(tokenize(text), statistics, author_zscores)[1]


def analyse(counts_by_author, text):
    statistics, author_zscores = build_profile(counts_by_author)
    raw_tokens = nltk.word_tokenize(text)
    tokens = [token.lower() for token in raw_tokens if any(c.isalpha() for c in token)]
    text_zscores, result = attribution(tokens, statistics, author_zscores)

    # What separates the verdict from its closest rival is what an edit has to change.
    # Each word's score is how far it moves the text toward the top author and away from that rival.
    top = author_zscores[result['ranking'][0]['author']]
    rival = author_zscores[result['ranking'][1]['author']]
    scores = {word: (abs(zscore - rival[word]) - abs(zscore - top[word])) / len(text_zscores)
              for word, zscore in text_zscores.items()}
    relevant = sorted((word for word in set(tokens) & set(scores) if scores[word] > 0),
                      key=lambda word: (-scores[word], word))[:SIGNIFICANT_TOKEN_COUNT]

    # A word gets one colour, so it takes the part of speech it has most often in this text.
    tags = {}
    for token, tag in nltk.pos_tag(raw_tokens):
        tags.setdefault(token.lower(), Counter())[tag] += 1
    return {
        **result,
        'tokensSignificantToAttribution': [
            {'token': word, 'partOfSpeech': tags[word].most_common(1)[0][0], 'score': scores[word]}
            for word in relevant
        ],
    }
