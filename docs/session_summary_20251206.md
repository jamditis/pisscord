# Session Summary - December 6, 2025

This document summarizes the remaining tasks and queued user messages from the session ending on December 6, 2025.

## Completed Tasks

*   Implemented GitHub Commit Feed for #dev-updates (Webhook support will require a Firebase Cloud Function).
*   Implemented Roadmap Viewer in #dev-updates.
*   Implemented Pissbot 'Brain Updates' notifications.
*   Implemented Community MOTD (Message of the Day) system.
*   Implemented GitHub Issue Tracking polling for #dev-updates.
*   Enforced 14-day message retention policy (cleanup old messages).
*   **Fix Avatars in Chat:** Avatars are now correctly displayed in the ChatArea.
*   **Lock Dev Channel:** Input for #dev-updates is now disabled and styled as read-only.
*   **Issues Channel Button:** The text input in #issues is replaced with a "Report Issue / Request Feature" button.
*   **Pissbot Error Handling:** Added timeout and improved error logging for Pissbot interactions.

## Remaining Todos

Here is the updated list of todos:

1.  **User Profile Picture Display:** Ensure uploaded user profile pictures are displayed everywhere a user picture/icon appears (e.g., in the online users list and voice stage).
2.  **Voice Channel User List:** When a user joins a voice channel, their avatar and username should appear nested under the voice channel they joined. There should be at least two separate, joinable voice channels.
3.  **Audio Activity Indicator:** Implement a visual indicator (e.g., a green ring around the user's profile picture in the bottom-right sidebar) to show when audio is being received from a user's microphone.
4.  **Firebase Image Resizer Plugin:** Integrate the Firebase image resizer plugin to optimize image uploads and reduce storage costs/memory usage.
5.  **Update `website/index.html`:** Update the website's `index.html` file to reflect the latest version and features, ensuring all front-facing content is current.
6.  **Remove Derogatory References:** Review and remove any derogatory or mocking references to "mom" or "dad" from all front-facing application text and the website.

## Queued User Messages

The following messages were received and are part of the context for the next session:

*   "also: i installed an image resizer plugin via firebase to help reduce storage costs/memory usage for image uploads"
*   "finally, when a user joins a voice channel their avatar and username should appear nested under the voice channel they joined (we should have at least 2 separate voice channels available and joinable) and we need some kind of indicator (perhaps a green ring around the user pfp image in the bottom right sidebar) to indicate when audio is received from user mic."
*   "we also need to update the @website/index.html with the latest version and features info"
*   "also take out any derogatory or mocking references to 'mom' or 'dad' from all frontfacing and web"
*   Content of `website/index.html` was provided for context and will need to be updated.
