from django.urls import include, path
from rest_framework.routers import DefaultRouter
from stylometry.api.views import (
    AnalyseView, AuthorViewset, CurrentUserView, DocumentsByAuthorView, DocumentViewset, FindAuthorView,
    GroupViewset, LoginView, LogoutView, RegisterView,
)

router = DefaultRouter()
router.register(r"authors", AuthorViewset)
router.register(r"documents", DocumentViewset, basename="documents")
router.register(r"groups", GroupViewset, basename="groups")

urlpatterns = [
    path("", include(router.urls)),
    path("findauthor/", FindAuthorView.as_view(),  name="find-author"),
    path("analyse/", AnalyseView.as_view(),  name="analyse"),
    path("docsbyauthor/", DocumentsByAuthorView.as_view(),  name="docs-by-author"),
    path("auth/register/", RegisterView.as_view(), name="register"),
    path("auth/login/", LoginView.as_view(), name="login"),
    path("auth/logout/", LogoutView.as_view(), name="logout"),
    path("auth/me/", CurrentUserView.as_view(), name="current-user"),
]