# ******************************************  Mendenhall’s Characteristic Curves of Composition  ********************************************
from stylometry.models import Author
from rest_framework.exceptions import APIException

import nltk
import matplotlib
import math


def mendenhall_characteristic_curves_of_composition(texts_by_author):
    
    word_tokens_by_author = {}
    length_distributions_by_author = {}

    # Create a list of word tokens for each author
    for author in texts_by_author:
        tokens = nltk.word_tokenize(texts_by_author[author])
        
        # Filter out punctuation
        word_tokens_by_author[author] = ([token for token in tokens
                                            if any(c.isalpha() for c in token)])

        
        # Get a distribution of token lengths
        token_lengths = [len(token) for token in word_tokens_by_author[author]]
        length_distributions_by_author[author] = nltk.FreqDist(token_lengths)
        print("Word Tokens for Author " + author + ": " +  str(length_distributions_by_author[author]))
        length_distributions_by_author[author].plot(15,title=author)
    return 0



# ************************************************  John Burrows’ Delta Method  ******************************************************************


def john_burrows_delta_method(texts_by_author, anonymous_text):
    
    word_tokens_by_author = {}
    whole_corpus = []

    # Create a list of word tokens for each author
    for author in texts_by_author:
        tokens = nltk.word_tokenize(texts_by_author[author])
        
        # Filter out punctuation
        word_tokens_by_author[author] = ([token for token in tokens
                                            if any(c.isalpha() for c in token)])

        # Convert papers to lowercase to count all tokens of the same word together
        # regardless of case
        word_tokens_by_author[author] = (
            [token.lower() for token in word_tokens_by_author[author]])
        
        whole_corpus += word_tokens_by_author[author]
    
    # Get a frequency distribution
    whole_corpus_freq_dist = list(nltk.FreqDist(whole_corpus).most_common(50))
    whole_corpus_freq_dist[ :10 ]  #assssssssssssssssssssssssssssssssssssssssssssssssssssssssssssassssssssssssssssssssssssssssssssss

    # The main data structure that holds features of the whole corpus
    features = [word for word,freq in whole_corpus_freq_dist]
    feature_freqs = {}

    
    for author in texts_by_author:
        # Create a dictionary for each candidate's features
        feature_freqs[author] = {}

        # A helper value containing the number of tokens in the author's subcorpus
        overall = len(word_tokens_by_author[author])

        # Calculate each feature's presence in the subcorpus
        for feature in features:
            presence = word_tokens_by_author[author].count(feature)
            feature_freqs[author][feature] = presence / overall

    # The data structure into which we will be storing the "corpus standard" statistics
    corpus_features = {}

    # For each feature...
    for feature in features:
        # Create a sub-dictionary that will contain the feature's mean
        # and standard deviation
        corpus_features[feature] = {}

        # Calculate the mean of the frequencies expressed in the subcorpora
        feature_average = 0
        for author in texts_by_author:
            feature_average += feature_freqs[author][feature]
        feature_average /= len(texts_by_author)
        corpus_features[feature]["Mean"] = feature_average

        # Calculate the standard deviation using the basic formula for a sample
        feature_stdev = 0
        for author in texts_by_author:
            diff = feature_freqs[author][feature] - corpus_features[feature]["Mean"]
            feature_stdev += diff*diff
        feature_stdev /= (len(texts_by_author) - 1)
        feature_stdev = math.sqrt(feature_stdev)
        corpus_features[feature]["StdDev"] = feature_stdev

    feature_zscores = {}
    for author in texts_by_author:
        feature_zscores[author] = {}
        for feature in features:

            # Z-score definition = (value - mean) / stddev
            # We use intermediate variables to make the code easier to read
            feature_val = feature_freqs[author][feature]
            feature_mean = corpus_features[feature]["Mean"]
            feature_stdev = corpus_features[feature]["StdDev"]
            feature_zscores[author][feature] = ((feature_val-feature_mean) /
                                                feature_stdev)


    # Tokenize the test case
    tokens_of_anonymous_text = nltk.word_tokenize(anonymous_text)

    # Filter out punctuation and lowercase the tokens
    tokens_of_anonymous_text = [token.lower() for token in tokens_of_anonymous_text
                    if any(c.isalpha() for c in token)]

    # Calculate the test case's features
    overall = len(tokens_of_anonymous_text)
    testcase_freqs = {}
    for feature in features:
        presence = tokens_of_anonymous_text.count(feature)
        testcase_freqs[feature] = presence / overall

    # Calculate the test case's feature z-scores
    testcase_zscores = {}
    for feature in features:
        feature_val = testcase_freqs[feature]
        feature_mean = corpus_features[feature]["Mean"]
        feature_stdev = corpus_features[feature]["StdDev"]
        testcase_zscores[feature] = (feature_val - feature_mean) / feature_stdev
        print("Anonymous text's z-score for feature", feature, "is", testcase_zscores[feature])


    # Calculate Delta score between each author and unknown text z-scores
    delta_score_by_author = {}    
    for author in texts_by_author:
        delta = 0
        for feature in features:
            delta += math.fabs((testcase_zscores[feature] -
                                feature_zscores[author][feature]))
        delta /= len(features)
        author = Author.objects.filter(pk=author).values().first()
        delta_score_by_author[author.get("name")] = delta
        print( "Delta score for candidate", author.get("name"), "is", delta )

    # Find author name with the lowest Delta score
    probable_author = min(delta_score_by_author, key=delta_score_by_author.get)
    return probable_author