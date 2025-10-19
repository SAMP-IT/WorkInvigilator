'use client';

import { Card, CardContent } from '@/components/ui/Card';

interface ProductivityBreakdownProps {
  productive: {
    hours: number;
    percentage: number;
  };
  neutral: {
    hours: number;
    percentage: number;
  };
  unproductive: {
    hours: number;
    percentage: number;
  };
  productivityScore?: number;
}

export function ProductivityBreakdown({
  productive,
  neutral,
  unproductive,
  productivityScore
}: ProductivityBreakdownProps) {
  const categories = [
    {
      label: 'Productive Time',
      hours: productive.hours,
      percentage: productive.percentage,
      color: 'bg-success',
      textColor: 'text-success',
      icon: 'P',
      description: 'IDEs, Office Suite, Documentation'
    },
    {
      label: 'Neutral Time',
      hours: neutral.hours,
      percentage: neutral.percentage,
      color: 'bg-warn',
      textColor: 'text-warn',
      icon: 'N',
      description: 'Meetings, Email, Communication'
    },
    {
      label: 'Unproductive Time',
      hours: unproductive.hours,
      percentage: unproductive.percentage,
      color: 'bg-danger',
      textColor: 'text-danger',
      icon: 'U',
      description: 'Social Media, Entertainment, Shopping'
    }
  ];

  const getScoreColor = (score: number) => {
    if (score >= 75) return 'text-success';
    if (score >= 50) return 'text-warn';
    return 'text-danger';
  };

  const getScoreLabel = (score: number) => {
    if (score >= 85) return 'Excellent';
    if (score >= 75) return 'Good';
    if (score >= 60) return 'Average';
    if (score >= 40) return 'Below Average';
    return 'Needs Improvement';
  };

  return (
    <div className="space-y-4">
      {/* Productivity Score Card */}
      {productivityScore !== undefined && (
        <Card elevated>
          <CardContent className="py-6">
            <div className="text-center">
              <p className="text-sm text-ink-muted mb-2">Overall Productivity Score</p>
              <div className={`text-4xl font-bold ${getScoreColor(productivityScore)}`}>
                {productivityScore.toFixed(1)}
                <span className="text-2xl">/100</span>
              </div>
              <p className={`text-sm font-medium mt-2 ${getScoreColor(productivityScore)}`}>
                {getScoreLabel(productivityScore)}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Category Breakdown */}
      <div className="space-y-3">
        {categories.map((category, index) => (
          <Card key={index} hover>
            <CardContent className="py-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-3">
                  <div className={`w-10 h-10 rounded-full ${category.color} flex items-center justify-center text-white font-bold`}>
                    {category.icon}
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-ink-hi">{category.label}</h4>
                    <p className="text-xs text-ink-muted">{category.description}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className={`text-2xl font-bold ${category.textColor}`}>
                    {category.percentage.toFixed(1)}%
                  </p>
                  <p className="text-xs text-ink-muted">{category.hours.toFixed(2)}h</p>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="w-full h-2 bg-surface rounded-full overflow-hidden">
                <div
                  className={`h-full ${category.color} transition-all duration-500`}
                  style={{ width: `${category.percentage}%` }}
                ></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Info Note */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
        <div className="flex items-start space-x-2">
          <div className="text-xs text-blue-800 dark:text-blue-200">
            <p className="font-medium mb-1">About Productivity Tracking</p>
            <p>
              Currently estimated from session activity. Install desktop app tracking for accurate
              app and website usage data.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
