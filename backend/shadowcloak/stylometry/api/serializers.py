from django.contrib.auth.models import User
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError as DjangoValidationError
from rest_framework import serializers
from stylometry.models import Author, Document, Group

MAX_DOCUMENT_LENGTH = 2_000_000
MAX_TEXT_LENGTH = 200_000
# Hashing is deliberately slow, so a huge password shouldn't reach it.
MAX_PASSWORD_LENGTH = 128


class OwnedNameMixin:
    """Names are stored in lowercase and are unique per user, however they were typed."""

    def validate_name(self, value):
        name = value.lower()
        same_name = self.Meta.model.objects.filter(user=self.context['request'].user, name=name)
        if self.instance:
            same_name = same_name.exclude(pk=self.instance.pk)
        if same_name.exists():
            raise serializers.ValidationError('You already have one with this name.')
        return name


class AuthorSerializer(OwnedNameMixin, serializers.ModelSerializer):

    class Meta:
        model = Author
        fields = "__all__"
        read_only_fields = ['user']


class DocumentSerializer(serializers.ModelSerializer):
    active = serializers.BooleanField(initial=True)
    author_name = serializers.StringRelatedField(read_only=True, source='author')

    class Meta:
        model = Document
        exclude = ['token_counts']
        extra_kwargs = {'body': {'max_length': MAX_DOCUMENT_LENGTH}}

    def get_fields(self):
        # Scoping the choices makes another user's ID look exactly like a missing one.
        # Without a request user, for example when nested read-only, nothing can be chosen.
        fields = super().get_fields()
        request = self.context.get('request')
        user = request.user if request else None
        fields['author'].queryset = Author.objects.filter(user=user)
        fields['group'].queryset = Group.objects.filter(user=user)
        return fields



class DocumentsByAuthorSerializer(serializers.ModelSerializer):
    documents = DocumentSerializer(many=True, read_only=True)

    class Meta:
        model = Author
        fields = ['id','name', 'documents']


class GroupSerializer(OwnedNameMixin, serializers.ModelSerializer):

    class Meta:
        model = Group
        fields = "__all__"
        read_only_fields = ['user']


class AttributionSerializer(serializers.Serializer):
    group = serializers.IntegerField()
    body = serializers.CharField(max_length=MAX_TEXT_LENGTH)


class RegisterSerializer(serializers.ModelSerializer):
    password1 = serializers.CharField(write_only=True, trim_whitespace=False, max_length=MAX_PASSWORD_LENGTH)
    password2 = serializers.CharField(write_only=True, trim_whitespace=False, max_length=MAX_PASSWORD_LENGTH)

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
    username = serializers.CharField(max_length=150)
    password = serializers.CharField(trim_whitespace=False, max_length=MAX_PASSWORD_LENGTH)
