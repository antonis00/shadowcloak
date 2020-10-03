from django.urls import include, path
from rest_framework.routers import DefaultRouter
from stylometry.api.views import AuthorViewset, DocumentViewset, GroupViewset, FindAuthorView

router = DefaultRouter()
router.register(r"authors", AuthorViewset)
router.register(r"documents", DocumentViewset, basename="documents")
router.register(r"groups", GroupViewset, basename="groups")

urlpatterns = [
    path("", include(router.urls)),
    path("findauthor/", FindAuthorView.as_view(),  name="find-author"),
    # path("avatar/", AvatarUpdateView.as_view(), name="avatar-update")
]