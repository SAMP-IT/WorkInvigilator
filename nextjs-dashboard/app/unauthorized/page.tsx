'use client';

import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';

export default function UnauthorizedPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Card className="bg-slate-800/80 backdrop-blur-sm border-slate-700">
          <CardHeader className="text-center">
            <div className="inline-flex items-center space-x-3 mb-4 justify-center">
              <div className="w-12 h-12 bg-red-500/20 rounded-lg flex items-center justify-center">
                <span className="text-red-400 font-bold text-xl">!</span>
              </div>
              <div className="text-left">
                <h1 className="text-2xl font-bold text-white">Access Denied</h1>
                <p className="text-slate-400 text-sm">Unauthorized Access</p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="text-center">
            <div className="mb-6">
              <p className="text-slate-300 mb-4">
                You don't have permission to access this resource.
              </p>
              <p className="text-slate-400 text-sm">
                Please contact your administrator if you believe this is an error.
              </p>
            </div>

            <div className="space-y-3">
              <Button
                onClick={() => router.push('/login')}
                className="w-full bg-primary hover:bg-primary/80"
              >
                Back to Login
              </Button>
              <Button
                variant="outline"
                onClick={() => router.back()}
                className="w-full border-slate-600 text-slate-300 hover:bg-slate-700"
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