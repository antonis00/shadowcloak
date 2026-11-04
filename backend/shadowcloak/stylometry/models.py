from django.db import models
from django.contrib.auth.models import User

from stylometry import engine


class Author(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    name = models.CharField(max_length=60)
    description = models.TextField(max_length=999, blank=True)
    class Meta:
        unique_together = ('name', 'user',)

    def __str__(self):
        return self.name


class Group(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    name = models.CharField(max_length=60)
    description = models.CharField(max_length=240, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    class Meta:
        unique_together = ('name', 'user',)

    def __str__(self):
        return f"{self.name}"

class Document(models.Model):
    author = models.ForeignKey(Author, on_delete=models.CASCADE, related_name='documents')
    group = models.ForeignKey(Group, on_delete=models.CASCADE)
    title = models.CharField(max_length=240)
    description = models.TextField(max_length=999, blank=True)
    body = models.TextField()
    # Always follows body, so attribution never has to re-read the text.
    token_counts = models.JSONField(default=dict, editable=False)
    active = models.BooleanField(default=True)
    publication_date = models.DateField()
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ('title', 'author',)

    def save(self, *args, **kwargs):
        self.token_counts = engine.count_tokens(self.body)
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.title} by {self.author}"
