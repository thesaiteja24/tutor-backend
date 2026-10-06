interface RequestEmailData {
  displayName: string;
  organizationName: string;
  reason?: string;
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  })[character] || character);
}

function render(title: string, body: string) {
  return {
    subject: title,
    text: body,
    html: `<div style="font-family:Arial,sans-serif;line-height:1.5"><h2>${escapeHtml(title)}</h2><p>${escapeHtml(body).replaceAll("\n", "<br>")}</p></div>`,
  };
}

export function renderOrganizationRequestSubmittedEmail(data: RequestEmailData) {
  return render("Organization request submitted", `Hi ${data.displayName},\n\nYour request to create ${data.organizationName} has been sent for review by a superadmin. We will email you when it is approved or rejected.`);
}

export function renderOrganizationRequestApprovedEmail(data: RequestEmailData) {
  return render("Organization request approved", `Hi ${data.displayName},\n\nYour request to create ${data.organizationName} was approved. Your account is now an organization admin.`);
}

export function renderOrganizationRequestRejectedEmail(data: RequestEmailData) {
  return render("Organization request update", `Hi ${data.displayName},\n\nYour request to create ${data.organizationName} was rejected.\n\nReason: ${data.reason || "No reason was provided."}`);
}

export function renderOrganizationAdminNotificationEmail(data: { displayName: string; subject: string; body: string }) {
  return render(data.subject, `Hi ${data.displayName},\n\n${data.body}`);
}
