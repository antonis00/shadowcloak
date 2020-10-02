from django.contrib import admin
from stylometry.models import Author, Document, Group

admin.site.register(Author)
admin.site.register(Document)
admin.site.register(Group)