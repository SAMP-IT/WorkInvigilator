import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { Card, CardHeader, CardContent } from '../components/ui/Card';

export default function Unauthorized() {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Card className="bg-white border-gray-200 shadow-xl">
          <CardHeader className="text-center">
            <div className="inline-flex items-center space-x-3 mb-4 justify-center">
              <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
                <span className="text-red-600 font-bold text-xl">!</span>
              </div>
              <div className="text-left">
                <h1 className="text-2xl font-bold text-gray-900">Access Denied</h1>
                <p className="text-gray-600 text-sm">Unauthorized Access</p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="text-center">
            <div className="mb-6">
              <p className="text-gray-700 mb-4">
                You don't have permission to access this resource.
              </p>
              <p className="text-gray-500 text-sm">
                Please contact your administrator if you believe this is an error.
              </p>
            </div>

            <div className="space-y-3">
              <Button
                onClick={() => navigate('/login')}
                className="w-full bg-blue-600 hover:bg-blue-700"
                variant="primary"
              >
                Back to Login
              </Button>
              <Button
                variant="outline"
                onClick={() => navigate(-1)}
                className="w-full border-gray-300 text-gray-700 hover:bg-gray-50"
              >
                Go Back
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
