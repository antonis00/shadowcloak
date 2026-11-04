"""Burrows' Delta, with no Django in it, so it can be read and tested on its own.

Each candidate's rate of the corpus's most common words is turned into z-scores. The
candidate whose z-scores are closest on average to the text's is the most likely author.
"""
import math
from collections import Counter

import nltk

FEATURE_COUNT = 50
SIGNIFICANT_TOKEN_COUNT = 30
CORPUS_TOKEN_COUNT = 10


class EngineError(ValueError):
    """The input can't be analysed. The message is written for the person who supplied it."""


def tokenize(text):
    return [token.lower() for token in nltk.word_tokenize(text) if any(c.isalpha() for c in token)]


def build_profile(texts_by_author):
    """Works out what the two public functions below share: the features and their z-scores."""
    counts = {author: Counter(tokenize(text)) for author, text in texts_by_author.items()}
    totals = {author: sum(count.values()) for author, count in counts.items()}
    # An author with no words has no rates to compare against.
    authors = [author for author, total in totals.items() if total]
    if len(authors) < 2:
        raise EngineError('This category needs documents with words in them from at least two authors. '
                          'Add more documents or choose another category.')

    corpus = Counter()
    for author in authors:
        corpus.update(counts[author])
    common = [word for word, _ in corpus.most_common(FEATURE_COUNT)]

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


def closest_author(text_zscores, author_zscores):
    def delta(author):
        scores = author_zscores[author]
        return sum(abs(text_zscores[word] - scores[word]) for word in text_zscores) / len(text_zscores)
    return min(author_zscores, key=delta)


def find_author(texts_by_author, text):
    statistics, author_zscores = build_profile(texts_by_author)
    return closest_author(score_text(tokenize(text), statistics), author_zscores)


def analyse(texts_by_author, text):
    statistics, author_zscores = build_profile(texts_by_author)
    raw_tokens = nltk.word_tokenize(text)
    tokens = [token.lower() for token in raw_tokens if any(c.isalpha() for c in token)]
    text_zscores = score_text(tokens, statistics)

    present = set(raw_tokens)
    significant = [word for word in statistics if word in present]
    return {
        'mostProbableAuthor': closest_author(text_zscores, author_zscores),
        'corpusTokens': nltk.pos_tag(list(statistics))[:CORPUS_TOKEN_COUNT],
        'anonymousTextTokens': [{'token': token, 'tag': tag} for token, tag in nltk.pos_tag(raw_tokens)],
        'tokensSignificantToAttribution': [
            {'token': word, 'partOfSpeech': tag, 'score': text_zscores[word]}
            for word, tag in nltk.pos_tag(significant)
        ][:SIGNIFICANT_TOKEN_COUNT],
        'rawUserText': text,
    }
