from stylometry.models import Author, Document, Group
from rest_framework.exceptions import APIException


def create_dictionary(user, group):

    papers = {}

    authors = Author.objects.filter(user=user).values_list('id', flat=True)

    for author in authors:
        documents = Document.objects.filter(author=author, group=group).values()
        author_text = ""

        if len(documents) == 0:
            continue

        for document in documents:
            author_text += str(document.get('body')) + " "

        papers[str(author)] = author_text.rstrip()

    if len(papers) < 2:
        raise APIException("There must be known documents from more than one authors in the selected category in order to infer authorship! Add more known documents or try another category.")

    return papers
