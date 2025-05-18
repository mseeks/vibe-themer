import * as vscode from 'vscode';

/**
 * Force a notification style update by creating and immediately dismissing a notification.
 * This helps to refresh the notification UI with the new colors.
 */
export function forceNotificationStyleRefresh(): void {
    // Create a hidden notification to force style refresh
    const notification = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
    notification.text = "Refreshing notification styles...";
    notification.show();
    
    // Hide it after a brief display
    setTimeout(() => {
        notification.dispose();
    }, 500);
}
