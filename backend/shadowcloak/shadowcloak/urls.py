from pathlib import Path

from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.http import FileResponse
from django.urls import include, path, re_path

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/', include('stylometry.api.urls')),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)


def frontend_page(request):
    """The app's router decides what to show for each page address, so they all get the same file."""
    return FileResponse(open(Path(settings.FRONTEND_DIR) / 'index.html', 'rb'), content_type='text/html')


if settings.FRONTEND_DIR:
    urlpatterns.append(re_path(r'^(?!api/|admin/|static/).*$', frontend_page))
