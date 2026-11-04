from django.contrib.auth.models import User
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError as DjangoValidationError
from rest_framework import serializers
from stylometry.models import Author, Document, Group


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
    author_name = serializers.StringRelatedField(read_only=True, source='author')

    class Meta:
        model = Document
        fields = "__all__"



class DocumentsByAuthorSerializer(serializers.ModelSerializer):
    documents = DocumentSerializer(many=True, read_only=True)

    class Meta:
        model = Author
        fields = ['id','name', 'documents']
        read_only_fields = ['user']

    def create(self, validated_data):
        author = Author.objects.create(user=self.context['request'].user,
                                 **validated_data)
        return author


class GroupSerializer(serializers.ModelSerializer):

    class Meta:
        model = Group
        fields = "__all__"
        read_only_fields = ['user']


class FindAuthor(serializers.Serializer):
    group = serializers.IntegerField()
    body = serializers.CharField ()


class RegisterSerializer(serializers.ModelSerializer):
    password1 = serializers.CharField(write_only=True, trim_whitespace=False)
    password2 = serializers.CharField(write_only=True, trim_whitespace=False)

    class Meta:
        model = User
        fields = ['username', 'password1', 'password2']

    def validate(self, data):
        if data['password1'] != data['password2']:
            raise serializers.ValidationError({'password2': ['The two passwords do not match.']})
        try:
            validate_password(data['password1'], user=User(username=data['username']))
        except DjangoValidationError as error:
            raise serializers.ValidationError({'password1': error.messages})
        return data

    def create(self, validated_data):
        return User.objects.create_user(username=validated_data['username'], password=validated_data['password1'])


class LoginSerializer(serializers.Serializer):
    username = serializers.CharField()
    password = serializers.CharField(trim_whitespace=False)
