from collections import Counter

from django.contrib.auth import authenticate, login, logout
from django.db.models import Prefetch, Sum
from django.db.models.functions import Length
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import csrf_protect, ensure_csrf_cookie
from rest_framework import generics
from rest_framework.exceptions import ParseError
from rest_framework.permissions import SAFE_METHODS, AllowAny
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.viewsets import ModelViewSet
from rest_framework.response import Response
from rest_framework import views
from rest_framework import status

from stylometry import engine
from stylometry.models import Author, Document, Group
from stylometry.api.serializers import AttributionSerializer, AuthorSerializer, DocumentSerializer, GroupSerializer, DocumentsByAuthorSerializer, LoginSerializer, RegisterSerializer
from stylometry.api.throttles import LoginAccountThrottle

# Attribution loads the word counts of a whole category, so this bounds the work one request does.
MAX_CORPUS_LENGTH = 10_000_000


class AuthorViewset(ModelViewSet):
    queryset = Author.objects.all()
    serializer_class = AuthorSerializer

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

    def get_queryset(self):
        return self.queryset.filter(user=self.request.user)


class DocumentViewset(ModelViewSet):
    queryset = Document.objects.all()
    serializer_class = DocumentSerializer

    def get_throttles(self):
        if self.request.method in SAFE_METHODS:
            return super().get_throttles()
        # Saving counts every word in the document, which is far more work than reading it.
        self.throttle_scope = 'document_write'
        return [ScopedRateThrottle()]

    def get_queryset(self):
        documents = self.queryset.filter(author__user=self.request.user).order_by('author')
        author = self.request.query_params.get('author')
        group = self.request.query_params.get('group')
        if author is not None:
            documents = documents.filter(author__name=author.lower())
        if group is not None:
            documents = documents.filter(group__name=group.lower())
        return documents


class DocumentsByAuthorView(views.APIView):

    def get(self, request, format=None):
        groups = Group.objects.filter(user=request.user)
        group_id = request.query_params.get('group')
        group = generics.get_object_or_404(groups, pk=group_id) if group_id else groups.first()
        if group is None:
            return Response([])

        # The prefetch is what keeps another category's documents out of the nested list.
        documents = Document.objects.filter(group=group).select_related('author')
        authors = (Author.objects.filter(user=request.user, documents__group=group)
                   .distinct().order_by('id').prefetch_related(Prefetch('documents', queryset=documents)))

        author_ids = request.query_params.get('author')
        if author_ids:
            try:
                authors = authors.filter(id__in=[int(author_id) for author_id in author_ids.split(',')])
            except ValueError:
                raise ParseError('The author filter must be a list of author IDs.')
        return Response(DocumentsByAuthorSerializer(authors, many=True).data)


class GroupViewset(ModelViewSet):
    queryset = Group.objects.all()
    serializer_class = GroupSerializer

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

    def get_queryset(self):
        return self.queryset.filter(user=self.request.user)


def counts_by_author(user, group_id):
    documents = Document.objects.filter(group_id=group_id, group__user=user)
    if (documents.aggregate(total=Sum(Length('body')))['total'] or 0) > MAX_CORPUS_LENGTH:
        raise ParseError('This category holds too much text to analyse. Remove some documents or use another category.')
    counts = {}
    for name, token_counts in documents.order_by('author_id', 'id').values_list('author__name', 'token_counts'):
        counts.setdefault(name, Counter()).update(token_counts)
    return counts


class AttributionView(views.APIView):
    """Runs one engine function on the submitted text, against one of the user's categories."""
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = 'analysis'
    run_engine = None

    def post(self, request, format=None):
        serializer = AttributionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        counts = counts_by_author(request.user, serializer.validated_data['group'])
        try:
            return Response(self.run_engine(counts, serializer.validated_data['body']))
        except engine.EngineError as error:
            raise ParseError(str(error))


class FindAuthorView(AttributionView):
    run_engine = staticmethod(engine.find_author)


class AnalyseView(AttributionView):
    run_engine = staticmethod(engine.analyse)


# DRF exempts its views from CSRF and only re-checks it for logged-in users, so the
# anonymous auth views ask for the check themselves.
@method_decorator(csrf_protect, name='dispatch')
class RegisterView(generics.CreateAPIView):
    authentication_classes = []
    permission_classes = [AllowAny]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = 'register'
    serializer_class = RegisterSerializer


@method_decorator(csrf_protect, name='dispatch')
class LoginView(views.APIView):
    authentication_classes = []
    permission_classes = [AllowAny]
    throttle_classes = [ScopedRateThrottle, LoginAccountThrottle]
    throttle_scope = 'login'

    def post(self, request, format=None):
        serializer = LoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = authenticate(request._request, **serializer.validated_data)
        if user is None:
            return Response({'detail': 'Incorrect username or password.'}, status=status.HTTP_400_BAD_REQUEST)
        login(request._request, user)
        return Response({'username': user.username})


class LogoutView(views.APIView):

    def post(self, request, format=None):
        logout(request._request)
        return Response(status=status.HTTP_204_NO_CONTENT)


@method_decorator(ensure_csrf_cookie, name='dispatch')
class CurrentUserView(views.APIView):
    """Tells the app who is logged in, and sets the CSRF cookie it needs for its first POST."""
    permission_classes = [AllowAny]

    def get(self, request, format=None):
        return Response({'username': request.user.username if request.user.is_authenticated else None})
