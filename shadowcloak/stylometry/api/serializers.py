from rest_framework import serializers
from stylometry.models import Author, Document, Group

from rest_framework_simplejwt.serializers import TokenObtainPairSerializer


class AuthorSerializer(serializers.ModelSerializer):

    class Meta:
        model = Author
        fields = "__all__"
        read_only_fields = ['user']

def create(self, validated_data):
        author = Author.objects.create(user=self.context['request'].user,
                                 **validated_data)
        return author

class DocumentSerializer(serializers.ModelSerializer):
    active = serializers.BooleanField(initial=True)

    class Meta:
        model = Document
        fields = "__all__"

class GroupSerializer(serializers.ModelSerializer):

    class Meta:
        model = Group
        fields = "__all__"
        read_only_fields = ['user']


class FindAuthor(serializers.Serializer):
    group = serializers.IntegerField()
    body = serializers.CharField ()


class MyTokenObtainPairSerializer(TokenObtainPairSerializer):
    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)

        # Add custom claims
        token['name'] = user.username
        # ...

        return token


# class AuthorAvatarSerializer(serializers.ModelSerializer):
    
#     class Meta:
#         model = Author
#         fields = ("avatar",)