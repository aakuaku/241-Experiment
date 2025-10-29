import React from 'react';

interface TaskDataProps {
  taskId: string;
}

// Helper function to render task-specific data tables
export function TaskDataTables({ taskId }: TaskDataProps) {
  switch (taskId) {
    case 'task-1':
      return (
        <div className="task-data-tables">
          <h3>Customer Feedback Sample</h3>
          <table className="data-table">
            <thead>
              <tr>
                <th>Rating</th>
                <th>Feedback</th>
              </tr>
            </thead>
            <tbody>
              <tr><td>⭐⭐⭐⭐⭐</td><td>"Love the new interface! Much easier to use than before."</td></tr>
              <tr><td>⭐⭐⭐⭐</td><td>"Good product but wish it loaded faster on mobile."</td></tr>
              <tr><td>⭐⭐</td><td>"Customer service response time needs improvement."</td></tr>
              <tr><td>⭐⭐⭐⭐⭐</td><td>"Best tool I've used for this purpose. Highly recommend!"</td></tr>
              <tr><td>⭐⭐</td><td>"Had some bugs with the latest update. Hope they fix it soon."</td></tr>
              <tr><td>⭐⭐⭐⭐</td><td>"Works well overall, but the pricing seems high for what you get."</td></tr>
              <tr><td>⭐⭐⭐⭐⭐</td><td>"Excellent features! The analytics dashboard is exactly what I needed."</td></tr>
              <tr><td>⭐⭐⭐</td><td>"It's okay, but there are better alternatives out there."</td></tr>
              <tr><td>⭐⭐⭐⭐</td><td>"Great product! Just needs better documentation."</td></tr>
              <tr><td>⭐⭐</td><td>"Frustrated with the login issues. Can't access my account sometimes."</td></tr>
            </tbody>
          </table>
          
          <h3 style={{ marginTop: '1.5rem' }}>Overall Statistics</h3>
          <table className="data-table">
            <thead>
              <tr>
                <th>Rating</th>
                <th>Count</th>
                <th>Percentage</th>
              </tr>
            </thead>
            <tbody>
              <tr><td>5-star</td><td>180</td><td>36%</td></tr>
              <tr><td>4-star</td><td>150</td><td>30%</td></tr>
              <tr><td>3-star</td><td>80</td><td>16%</td></tr>
              <tr><td>2-star</td><td>60</td><td>12%</td></tr>
              <tr><td>1-star</td><td>30</td><td>6%</td></tr>
              <tr><td><strong>Total</strong></td><td><strong>500</strong></td><td><strong>100%</strong></td></tr>
              <tr><td><strong>Average</strong></td><td colSpan={2}><strong>3.4/5</strong></td></tr>
            </tbody>
          </table>
        </div>
      );

    case 'task-2':
      return (
        <div className="task-data-tables">
          <h3>Strategy Comparison</h3>
          <table className="data-table">
            <thead>
              <tr>
                <th>Factor</th>
                <th>Strategy A: Social Media</th>
                <th>Strategy B: Content & SEO</th>
              </tr>
            </thead>
            <tbody>
              <tr><td>Budget</td><td>$50,000</td><td>$50,000</td></tr>
              <tr><td>Platforms/Approach</td><td>Facebook, Instagram, LinkedIn</td><td>Blog posts, SEO, Email</td></tr>
              <tr><td>Expected Reach</td><td>2-3M impressions</td><td>500K-1M monthly visitors</td></tr>
              <tr><td>Target Audience</td><td>Ages 25-45, professionals</td><td>Ages 30-50, decision-makers</td></tr>
              <tr><td>Duration</td><td>3 months</td><td>6 months</td></tr>
              <tr><td>Previous CTR/Conversion</td><td>3.2% CTR</td><td>2.1% conversion rate</td></tr>
              <tr><td>Cost per Acquisition</td><td>$15</td><td>$8</td></tr>
            </tbody>
          </table>
        </div>
      );

    case 'task-3':
      return (
        <div className="task-data-tables">
          <h3>Preference vs. Behavior Gap</h3>
          <table className="data-table">
            <thead>
              <tr>
                <th>Age Group</th>
                <th>Stated Preference</th>
                <th>Actual Purchase</th>
                <th>Gap</th>
              </tr>
            </thead>
            <tbody>
              <tr><td>18-25</td><td>52%</td><td>28%</td><td>24%</td></tr>
              <tr><td>25-35</td><td>65%</td><td>18%</td><td>47%</td></tr>
              <tr><td>35-50</td><td>70%</td><td>25%</td><td>45%</td></tr>
              <tr><td>50+</td><td>72%</td><td>21%</td><td>51%</td></tr>
            </tbody>
          </table>

          <h3 style={{ marginTop: '1.5rem' }}>Income Factors</h3>
          <table className="data-table">
            <thead>
              <tr>
                <th>Income Level</th>
                <th>Purchase Rate</th>
              </tr>
            </thead>
            <tbody>
              <tr><td>High (&gt;$75k)</td><td>45%</td></tr>
              <tr><td>Middle ($40-75k)</td><td>22%</td></tr>
              <tr><td>Lower (&lt;$40k)</td><td>12%</td></tr>
            </tbody>
          </table>
        </div>
      );

    case 'task-4':
      return (
        <div className="task-data-tables">
          <h3>Market Comparison</h3>
          <table className="data-table">
            <thead>
              <tr>
                <th>Market</th>
                <th>Characteristics</th>
                <th>Performance</th>
              </tr>
            </thead>
            <tbody>
              <tr><td>Market A</td><td>Similar size</td><td>40% faster growth</td></tr>
              <tr><td>Market B</td><td>Similar demographics</td><td>15% slower adoption</td></tr>
              <tr><td>Market C</td><td>Similar competition</td><td>Broke even in 8 months</td></tr>
            </tbody>
          </table>

          <h3 style={{ marginTop: '1.5rem' }}>Target Market Economic Indicators</h3>
          <table className="data-table">
            <thead>
              <tr>
                <th>Indicator</th>
                <th>Value</th>
              </tr>
            </thead>
            <tbody>
              <tr><td>GDP Growth</td><td>3.2% (above average)</td></tr>
              <tr><td>Unemployment</td><td>4.1% (low)</td></tr>
              <tr><td>Median Household Income</td><td>$58,000</td></tr>
              <tr><td>Population Growth</td><td>+2.3% annually</td></tr>
            </tbody>
          </table>
        </div>
      );

    case 'task-5':
      return (
        <div className="task-data-tables">
          <h3>Business Proposal Summary</h3>
          <table className="data-table">
            <thead>
              <tr>
                <th>Category</th>
                <th>Details</th>
              </tr>
            </thead>
            <tbody>
              <tr><td>Market Size</td><td>$2B target market</td></tr>
              <tr><td>Market Growth</td><td>45% YoY growth in food delivery apps</td></tr>
              <tr><td>Potential Users</td><td>500K in target cities</td></tr>
              <tr><td>Commission Rate</td><td>15% per transaction</td></tr>
              <tr><td>Vendor Subscription</td><td>$99/month (optional)</td></tr>
              <tr><td>Year 1 Revenue</td><td>$2M (projected)</td></tr>
              <tr><td>Year 2 Revenue</td><td>$8M (projected)</td></tr>
              <tr><td>Investment Ask</td><td>$500K for 20% equity</td></tr>
              <tr><td>Pre-money Valuation</td><td>$2.5M</td></tr>
            </tbody>
          </table>
        </div>
      );

    case 'task-6':
      return (
        <div className="task-data-tables">
          <h3>Website Metrics Comparison</h3>
          <table className="data-table">
            <thead>
              <tr>
                <th>Metric</th>
                <th>Before</th>
                <th>After</th>
                <th>Change</th>
              </tr>
            </thead>
            <tbody>
              <tr><td>Monthly Visitors</td><td>50,000</td><td>57,500</td><td className="positive">+15%</td></tr>
              <tr><td>Pages per Session</td><td>2.3</td><td>3.1</td><td className="positive">+35%</td></tr>
              <tr><td>Time on Site</td><td>3:45</td><td>5:20</td><td className="positive">+42%</td></tr>
              <tr><td>Checkout Completion</td><td>12%</td><td>11.04%</td><td className="negative">-8%</td></tr>
              <tr><td>Checkout Time</td><td>4:30</td><td>6:15</td><td className="negative">+37%</td></tr>
            </tbody>
          </table>

          <h3 style={{ marginTop: '1.5rem' }}>Device Breakdown</h3>
          <table className="data-table">
            <thead>
              <tr>
                <th>Device</th>
                <th>Checkout Completion Change</th>
              </tr>
            </thead>
            <tbody>
              <tr><td>Desktop</td><td className="negative">-5%</td></tr>
              <tr><td>Mobile</td><td className="negative">-12%</td></tr>
              <tr><td>Tablet</td><td className="negative">-3%</td></tr>
            </tbody>
          </table>
        </div>
      );

    case 'task-7':
      return (
        <div className="task-data-tables">
          <h3>Feature Comparison</h3>
          <table className="data-table">
            <thead>
              <tr>
                <th>Factor</th>
                <th>Feature A: Analytics</th>
                <th>Feature B: Mobile App</th>
              </tr>
            </thead>
            <tbody>
              <tr><td>Development Time</td><td>3 months</td><td>4 months</td></tr>
              <tr><td>Team Required</td><td>2 devs, 1 designer</td><td>3 devs, 1 designer, 1 QA</td></tr>
              <tr><td>Expected Adoption</td><td>35%</td><td>55%</td></tr>
              <tr><td>Maintenance Cost</td><td>$5K/year</td><td>$15K/year</td></tr>
              <tr><td>Competitive Advantage</td><td>Moderate</td><td>High</td></tr>
              <tr><td>User Requests</td><td>42% (enterprise)</td><td>68% (all users)</td></tr>
              <tr><td>Revenue Impact</td><td>+$50K/year</td><td>+$120K/year</td></tr>
            </tbody>
          </table>
        </div>
      );

    case 'task-8':
      return (
        <div className="task-data-tables">
          <h3>Work Arrangement Satisfaction</h3>
          <table className="data-table">
            <thead>
              <tr>
                <th>Work Arrangement</th>
                <th>Satisfaction Rate</th>
              </tr>
            </thead>
            <tbody>
              <tr><td>Remote</td><td>58%</td></tr>
              <tr><td>Hybrid</td><td>52%</td></tr>
              <tr><td>Office</td><td>32%</td></tr>
            </tbody>
          </table>

          <h3 style={{ marginTop: '1.5rem' }}>Productivity Metrics</h3>
          <table className="data-table">
            <thead>
              <tr>
                <th>Metric</th>
                <th>Remote Workers</th>
                <th>Office Workers</th>
                <th>Difference</th>
              </tr>
            </thead>
            <tbody>
              <tr><td>Productivity</td><td>High</td><td>Baseline</td><td className="positive">+12%</td></tr>
              <tr><td>Collaboration</td><td>Lower</td><td>Higher</td><td className="negative">-8%</td></tr>
              <tr><td>Meeting Effectiveness</td><td>Lower</td><td>Higher</td><td className="negative">-10%</td></tr>
              <tr><td>Employee Turnover</td><td>Lower</td><td>Higher</td><td className="positive">-15%</td></tr>
            </tbody>
          </table>
        </div>
      );

    default:
      return null;
  }
}

