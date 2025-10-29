import { Card, CardHeader, CardTitle, CardContent } from './Card';
import { Badge } from './Badge';

interface Employee {
  rank: number;
  employeeId: string;
  employeeName: string;
  department: string;
  productivityPercentage: number;
  totalHours: number;
  percentageAboveAverage?: number;
  percentageBelowAverage?: number;
}

interface ProductivityLeaderboardProps {
  topPerformers: Employee[];
  bottomPerformers: Employee[];
  teamAverage: number;
  onEmployeeClick?: (employeeId: string) => void;
}

export function ProductivityLeaderboard({
  topPerformers,
  bottomPerformers,
  teamAverage,
  onEmployeeClick
}: ProductivityLeaderboardProps) {
  const getMedalIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return '1st'
      case 2:
        return '2nd'
      case 3:
        return '3rd'
      default:
        return `#${rank}`
    }
  };

  const getProductivityColor = (percentage: number) => {
    if (percentage >= 75) return 'text-green-600';
    if (percentage >= 50) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getProductivityBg = (percentage: number) => {
    if (percentage >= 75) return 'bg-green-50 border-green-200';
    if (percentage >= 50) return 'bg-yellow-50 border-yellow-200';
    return 'bg-red-50 border-red-200';
  };

  const getProgressBarColor = (percentage: number) => {
    if (percentage >= 75) return 'bg-green-500';
    if (percentage >= 50) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Top Performers */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Top Performers</CardTitle>
            <Badge variant="success">High Productivity</Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {topPerformers.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <p className="text-sm">No data available</p>
              </div>
            ) : (
              topPerformers.map((employee) => (
                <div
                  key={employee.employeeId}
                  className={`p-4 rounded-lg border cursor-pointer transition-all hover:shadow-md ${getProductivityBg(employee.productivityPercentage)}`}
                  onClick={() => onEmployeeClick?.(employee.employeeId)}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center text-sm font-bold shadow-sm border border-gray-200">
                        {getMedalIcon(employee.rank)}
                      </div>
                      <div>
                        <h4 className="text-sm font-semibold text-gray-900">
                          {employee.employeeName}
                        </h4>
                        <p className="text-xs text-gray-600">{employee.department}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className={`text-2xl font-bold ${getProductivityColor(employee.productivityPercentage)}`}>
                        {employee.productivityPercentage}%
                      </div>
                      <div className="text-xs text-gray-600">{employee.totalHours}h total</div>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="w-full h-2 bg-white rounded-full overflow-hidden mb-2 border border-gray-200">
                    <div
                      className={`h-full ${getProgressBarColor(employee.productivityPercentage)} transition-all duration-500`}
                      style={{ width: `${employee.productivityPercentage}%` }}
                    ></div>
                  </div>

                  {/* Above Average Indicator */}
                  {employee.percentageAboveAverage !== undefined && (
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-gray-600">Team Average: {teamAverage}%</span>
                      <span className="text-green-600 font-medium">
                        +{employee.percentageAboveAverage}% above avg
                      </span>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Bottom Performers (Needs Support) */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Needs Support</CardTitle>
            <Badge variant="warning">Low Productivity</Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {bottomPerformers.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <p className="text-sm">No data available</p>
              </div>
            ) : (
              bottomPerformers.map((employee) => (
                <div
                  key={employee.employeeId}
                  className={`p-4 rounded-lg border cursor-pointer transition-all hover:shadow-md ${getProductivityBg(employee.productivityPercentage)}`}
                  onClick={() => onEmployeeClick?.(employee.employeeId)}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center text-sm font-bold shadow-sm border border-gray-200 text-gray-600">
                        #{employee.rank}
                      </div>
                      <div>
                        <h4 className="text-sm font-semibold text-gray-900">
                          {employee.employeeName}
                        </h4>
                        <p className="text-xs text-gray-600">{employee.department}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className={`text-2xl font-bold ${getProductivityColor(employee.productivityPercentage)}`}>
                        {employee.productivityPercentage}%
                      </div>
                      <div className="text-xs text-gray-600">{employee.totalHours}h total</div>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="w-full h-2 bg-white rounded-full overflow-hidden mb-2 border border-gray-200">
                    <div
                      className={`h-full transition-all duration-500 ${getProgressBarColor(employee.productivityPercentage)}`}
                      style={{ width: `${employee.productivityPercentage}%` }}
                    ></div>
                  </div>

                  {/* Below Average Indicator */}
                  {employee.percentageBelowAverage !== undefined && (
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-gray-600">Team Average: {teamAverage}%</span>
                      <span className="text-red-600 font-medium">
                        -{employee.percentageBelowAverage}% below avg
                      </span>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>

          {/* Support Suggestions */}
          {bottomPerformers.length > 0 && (
            <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-3">
              <p className="text-xs text-blue-800">
                <strong>Tip:</strong> Consider one-on-one meetings to understand challenges
                and provide support or training where needed.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
