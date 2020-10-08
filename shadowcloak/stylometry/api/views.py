
from rest_framework import generics
from rest_framework.permissions import IsAuthenticated
from rest_framework.viewsets import ModelViewSet
from rest_framework.exceptions import NotFound
from rest_framework.response import Response
from rest_framework import viewsets
from rest_framework import mixins
from rest_framework import views
from stylometry.models import Author, Document, Group
from stylometry.api.permissions import IsOwnerOrReadOnly
from stylometry.api.serializers import AuthorSerializer, DocumentSerializer, GroupSerializer, FindAuthor, MyTokenObtainPairSerializer, DocumentsByAuthorSerializer
from rest_auth.registration.views import RegisterView

from stylometry.api.services.retrieve_documents import create_dictionary
from stylometry.api.services.analysis import mendenhall_characteristic_curves_of_composition, john_burrows_delta_method

from rest_framework_simplejwt.views import TokenObtainPairView

class AuthorViewset(mixins.UpdateModelMixin, mixins.ListModelMixin, mixins.RetrieveModelMixin, mixins.CreateModelMixin, mixins.DestroyModelMixin, viewsets.GenericViewSet):
    queryset = Author.objects.all()
    serializer_class = AuthorSerializer
    permission_classes = [IsAuthenticated]
    

    def perform_create(self, serializer):
        user = self.request.user
        name = self.request.data.get('name').lower()
        serializer.save(user=user, name=name)

    def get_queryset(self):
        return self.queryset.filter(user=self.request.user)

    
class DocumentViewset(ModelViewSet):
    queryset = Document.objects.all()
    serializer_class = DocumentSerializer
    permission_classes = [IsAuthenticated]


    def perform_create(self, serializer):
        author_id = self.request.data.get('author')
        author = Author.objects.filter(pk=author_id).first()
        user = self.request.user

        if author.user != user: 
            raise NotFound('Author ' + str(author) + ' not found!')
        else:
            serializer.save(author=author)


    def get_queryset(self):
        author = self.request.query_params.get('author', None)
        group = self.request.query_params.get('group', None)

        if author is not None:
            if group is not None:
                return self.queryset.filter(author__user__username=self.request.user, author__name=author.lower(), group__name=group.lower()).order_by('author')
            else:
                return self.queryset.filter(author__user__username=self.request.user, author__name=author.lower()).order_by('author')
        else:
            if group is not None:
                return self.queryset.filter(author__user__username=self.request.user, group__name=group.lower()).order_by('author')

        return self.queryset.filter(author__user__username=self.request.user).order_by('author')
        


class DocumentsByAuthorView(views.APIView):
    permission_classes = [IsAuthenticated]
    
    def get(self, request, format=None):
        user = self.request.user
        return Response(DocumentsByAuthorSerializer(Author.objects.filter(user=user), many=True).data)


    
class GroupViewset(ModelViewSet):
    queryset = Group.objects.all()
    serializer_class = GroupSerializer
    permission_classes = [IsAuthenticated]

    def perform_create(self, serializer):
        user = self.request.user
        name = self.request.data.get('name').lower()
        serializer.save(user=user, name=name)

    def get_queryset(self):
        return self.queryset.filter(user=self.request.user)


class FindAuthorView(views.APIView):
    permission_classes = [IsAuthenticated]
    
    def post(self, request, format=None):
        user = self.request.user
        group = self.request.data.get('group')
        body = self.request.data.get('body')
        documents_dictionary = create_dictionary(user, group)
        # mendenhall_characteristic_curves_of_composition(documents_dictionary)
        result = john_burrows_delta_method(documents_dictionary, body)
        return Response(result)



class MyTokenObtainPairView(TokenObtainPairView):
    serializer_class = MyTokenObtainPairSerializer


class CustomRegisterView(RegisterView):
    authentication_classes = []
    permission_classes = []

    def create(self, request, *args, **kwargs):
        response = super().create(request, *args, **kwargs)
        return response