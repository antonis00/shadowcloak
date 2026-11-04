# Mendenhall’s Characteristic Curves of Composition
from stylometry.models import Author
from rest_framework.exceptions import APIException

from bs4 import BeautifulSoup

import re
import json
import requests

import nltk
import matplotlib
import math


def curves_of_composition(texts_by_author):
    
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
        # print("Word Tokens for Author " + author + ": " +  str(length_distributions_by_author[author]))
        length_distributions_by_author[author].plot(15,title=author)
    return 0



# John Burrows’ Delta Method


def analyse_with_burrows_delta(texts_by_author, anonymous_text):
    
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

    # The main data structure that holds features of the whole corpus
    features = [word for word,freq in whole_corpus_freq_dist]
    # features_as_string = ' '.join([str(feature) for feature in features])
    # print(features_as_string)
    tagged_features = nltk.pos_tag(features)
    # print(tagged_features)
    

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
            # Using intermediate variables to make the code easier to read
            feature_val = feature_freqs[author][feature]
            feature_mean = corpus_features[feature]["Mean"]
            feature_stdev = corpus_features[feature]["StdDev"]
            feature_zscores[author][feature] = ((feature_val-feature_mean) /
                                                feature_stdev)


    # Tokenize the test case
    tokens_of_anonymous_text = nltk.word_tokenize(anonymous_text)
    tagged_tokens_of_anonymous_text = nltk.pos_tag(tokens_of_anonymous_text)

    list_of_tokens, list_of_tags = zip(*tagged_tokens_of_anonymous_text)
    dictionary_with_tagged_tokens_of_anonymous_text = [{'token': token, 'tag': tag} for token,tag in zip(list_of_tokens, list_of_tags)]
    # print(dictionary_with_tagged_tokens_of_anonymous_text)

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
    significant_features = []
    significant_features_score = []
    for feature in features:
        feature_val = testcase_freqs[feature]
        feature_mean = corpus_features[feature]["Mean"]
        feature_stdev = corpus_features[feature]["StdDev"]
        testcase_zscores[feature] = (feature_val - feature_mean) / feature_stdev
        if (feature in list_of_tokens):
            significant_features.append(feature)
            significant_features_score.append(testcase_zscores[feature])
            # print("Anonymous text's z-score for feature", feature, "is", testcase_zscores[feature])

    tagged_significant_features = nltk.pos_tag(significant_features)
    list_of_tokens, list_of_tags = zip(*tagged_significant_features)
    dictionary_with_tagged_significant_features = [{'token': token, 'partOfSpeech': tag, 'score': score} for token,tag, score in zip(list_of_tokens, list_of_tags, significant_features_score)]

    # print(dictionary_with_tagged_significant_features)

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


    result = {}
    result['mostProbableAuthor'] = probable_author
    result['corpusTokens'] = tagged_features[:10]
    result['anonymousTextTokens'] = dictionary_with_tagged_tokens_of_anonymous_text
    result['tokensSignificantToAttribution'] = dictionary_with_tagged_significant_features[:30]
    result['rawUserText'] = anonymous_text
    # result['synonymsList'] = get_tokens_synonyms(features[:10])

    return result


# def get_tokens_synonyms(corpusTokens):
#     synonymsList = []

#     for token in corpusTokens:
#         result = {}
#         result['token'] = token
        
#         # url = 'https://www.thesaurus.com/browse/{}'.format(token)
#         # response = requests.get(url)
#         # soup = BeautifulSoup(response.text, "html.parser")
        
#         soup = BeautifulSoup("response.text", "html.parser")
#         scripts = soup.findAll('script')
#         scriptTexts = []

#         if not scripts or len(scripts) <= 0:
#             result['synonyms'] = [None]
#             synonymsList.append(result)
#             continue

#         for script in scripts:
#             scriptTexts.append(str(script))

#         if not scriptTexts[-2]:
#             result['synonyms'] = [None]
#             synonymsList.append(result)
#             continue

#         synonymsScript = scriptTexts[-2]

#         if len(synonymsScript.split('window.INITIAL_STATE ='))<2 or len(synonymsScript.split('synonyms'))<2:
#             result['synonyms'] = [None]
#             synonymsList.append(result)
#             continue

#         jsonStr = synonymsScript.split('window.INITIAL_STATE =')[1].lstrip()
#         jsonStr = jsonStr.split('};')[0].rstrip()
#         jsonStr = '{"synonyms' + synonymsScript.split('synonyms')[1].lstrip()
#         jsonStr = jsonStr.split(',"antonyms"')[0].rstrip() + '}'
#         jsonStr = jsonStr.replace("'", '"')
#         jsonObject = json.loads(jsonStr)


#         bagOfSynonyms = []

#         for synonymsJSON in jsonObject['synonyms']:
#             bagOfSynonyms.append(synonymsJSON['term'])

        
#         result['synonyms'] = bagOfSynonyms
#         synonymsList.append(result)

#     return synonymsList