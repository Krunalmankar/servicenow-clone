// Choice lists (sys_choice equivalent). Values are stored, labels are displayed.
export type Choice = { value: string; label: string };

const c = (pairs: [string, string][]): Choice[] => pairs.map(([value, label]) => ({ value, label }));

export const CHOICES = {
  impact: c([["1", "1 - High"], ["2", "2 - Medium"], ["3", "3 - Low"]]),
  urgency: c([["1", "1 - High"], ["2", "2 - Medium"], ["3", "3 - Low"]]),
  priority: c([["1", "1 - Critical"], ["2", "2 - High"], ["3", "3 - Moderate"], ["4", "4 - Low"], ["5", "5 - Planning"]]),
  incidentState: c([
    ["new", "New"], ["in_progress", "In Progress"], ["on_hold", "On Hold"],
    ["resolved", "Resolved"], ["closed", "Closed"], ["canceled", "Canceled"],
  ]),
  onHoldReason: c([
    ["awaiting_caller", "Awaiting Caller"], ["awaiting_change", "Awaiting Change"],
    ["awaiting_problem", "Awaiting Problem"], ["awaiting_vendor", "Awaiting Vendor"],
  ]),
  incidentCategory: c([
    ["inquiry", "Inquiry / Help"], ["software", "Software"], ["hardware", "Hardware"],
    ["network", "Network"], ["database", "Database"], ["security", "Security"],
  ]),
  contactType: c([["self-service", "Self-service"], ["email", "Email"], ["phone", "Phone"], ["walk-in", "Walk-in"], ["chat", "Chat"]]),
  resolutionCode: c([
    ["solved_permanently", "Solved (Permanently)"], ["solved_workaround", "Solved (Work Around)"],
    ["solved_remotely", "Solved Remotely"], ["not_solved", "Not Solved (Not Reproducible)"],
    ["duplicate", "Duplicate"], ["known_error", "Known Error"], ["user_error", "User Error"],
  ]),
  problemState: c([
    ["new", "New"], ["assess", "Assess"], ["rca", "Root Cause Analysis"],
    ["fix_in_progress", "Fix in Progress"], ["resolved", "Resolved"], ["closed", "Closed"],
  ]),
  problemResolution: c([["fix_applied", "Fix Applied"], ["risk_accepted", "Risk Accepted"], ["duplicate", "Duplicate"], ["canceled", "Canceled"]]),
  changeType: c([["normal", "Normal"], ["standard", "Standard"], ["emergency", "Emergency"]]),
  changeState: c([
    ["new", "New"], ["assess", "Assess"], ["authorize", "Authorize"], ["scheduled", "Scheduled"],
    ["implement", "Implement"], ["review", "Review"], ["closed", "Closed"], ["canceled", "Canceled"],
  ]),
  changeRisk: c([["very_high", "Very High"], ["high", "High"], ["moderate", "Moderate"], ["low", "Low"]]),
  changeCategory: c([["software", "Software"], ["hardware", "Hardware"], ["network", "Network"], ["database", "Database"], ["documentation", "Documentation"], ["other", "Other"]]),
  changeCloseCode: c([["successful", "Successful"], ["successful_issues", "Successful with issues"], ["unsuccessful", "Unsuccessful"]]),
  approval: c([["not_requested", "Not Yet Requested"], ["requested", "Requested"], ["approved", "Approved"], ["rejected", "Rejected"]]),
  requestState: c([["open", "Open"], ["closed_complete", "Closed Complete"], ["closed_incomplete", "Closed Incomplete"]]),
  ritmState: c([["open", "Open"], ["work_in_progress", "Work in Progress"], ["closed_complete", "Closed Complete"], ["closed_incomplete", "Closed Incomplete"]]),
  ritmStage: c([["waiting_for_approval", "Waiting for Approval"], ["fulfillment", "Fulfillment"], ["delivered", "Delivered"], ["rejected", "Request Rejected"]]),
  ciClass: c([
    ["business_service", "Business Service"], ["application", "Application"], ["server", "Server"],
    ["database", "Database"], ["network", "Network Gear"], ["computer", "Computer"], ["storage", "Storage"],
  ]),
  ciStatus: c([["operational", "Operational"], ["non_operational", "Non-Operational"], ["repair", "Repair in Progress"], ["retired", "Retired"]]),
  environment: c([["production", "Production"], ["staging", "Staging"], ["test", "Test"], ["development", "Development"]]),
  criticality: c([["1", "1 - Most critical"], ["2", "2 - Somewhat critical"], ["3", "3 - Less critical"], ["4", "4 - Not critical"]]),
  relType: c([["depends_on", "Depends on :: Used by"], ["runs_on", "Runs on :: Runs"], ["hosted_on", "Hosted on :: Hosts"], ["connected_to", "Connected to :: Connected by"], ["contains", "Contains :: Contained by"]]),
  kbState: c([["draft", "Draft"], ["review", "Review"], ["published", "Published"], ["retired", "Retired"]]),
  kbCategory: c([["general", "General"], ["how_to", "How To"], ["troubleshooting", "Troubleshooting"], ["policy", "Policy"], ["faq", "FAQ"], ["known_error", "Known Error"]]),
  slaTable: c([["incident", "Incident"], ["problem", "Problem"], ["change_request", "Change Request"], ["sc_req_item", "Requested Item"]]),
  slaType: c([["response", "Response"], ["resolution", "Resolution"]]),
  slaStage: c([["in_progress", "In Progress"], ["paused", "Paused"], ["completed", "Completed"], ["cancelled", "Cancelled"]]),
} satisfies Record<string, Choice[]>;

export type ChoiceList = keyof typeof CHOICES;

export function label(list: ChoiceList, value: string | number | null | undefined): string {
  if (value === null || value === undefined || value === "") return "";
  const v = String(value);
  return CHOICES[list].find((ch) => ch.value === v)?.label ?? v;
}

export const ACTIVE_INCIDENT_STATES = ["new", "in_progress", "on_hold"];
export const ACTIVE_PROBLEM_STATES = ["new", "assess", "rca", "fix_in_progress"];
export const ACTIVE_CHANGE_STATES = ["new", "assess", "authorize", "scheduled", "implement", "review"];
