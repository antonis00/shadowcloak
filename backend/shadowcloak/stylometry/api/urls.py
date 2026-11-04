from django.urls import include, path
from rest_framework.routers import DefaultRouter
from stylometry.api.views import AuthorViewset, DocumentViewset, GroupViewset, FindAuthorView, DocumentsByAuthorView, AnalyseView

router = DefaultRouter()
router.register(r"authors", AuthorViewset)
router.register(r"documents", DocumentViewset, basename="documents")
router.register(r"groups", GroupViewset, basename="groups")

urlpatterns = [
    path("", include(router.urls)),
    path("findauthor/", FindAuthorView.as_view(),  name="find-author"),
    path("analyse/", AnalyseView.as_view(),  name="analyse"),
    path("docsbyauthor/", DocumentsByAuthorView.as_view(),  name="docs-by-author"),
]