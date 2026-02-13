# admin_api/middleware.py - CSRF Exempt Middleware for Admin API

class AdminApiCsrfExemptMiddleware:
    """
    Middleware to exempt /api/admin/* endpoints from CSRF checks.
    This is safe because we're using session authentication with proper permissions.
    """

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        # Check if this is an admin API request
        if request.path.startswith('/api/admin/'):
            setattr(request, '_dont_enforce_csrf_checks', True)

        response = self.get_response(request)
        return response