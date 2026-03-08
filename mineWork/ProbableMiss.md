
# Potentially Missing or Unclear Areas

1. **Push Notifications**
   - No clear mention of browser/mobile push notifications for new messages.
2. **Message Search**
   - No explicit mention of searching within chat history.
3. **Media Types**
   - Only Image
4. **Admin/Moderation Tools (UI)**
   - No moderation for now
5. **Rate Limiting/Spam Protection**
   - No explicit mention of anti-spam or rate limiting on message sending.
6. **Testing**
   - No mention of automated tests (unit/integration/e2e) for backend or frontend.
7. **Deployment/CI**
   - No mention of deployment scripts, Docker, or CI/CD setup.
8. **Accessibility (a11y)**
   - No mention of accessibility features in the frontend.


_Last updated: March 8, 2026_




Issues:

    1. Backend has no syntax issues.
    2. Write a backend logic which prevent the deletion of the 
        default avatars available, current logic applies but only
        to 2-3 images, so extend to the all or so.
    3. Update and Write (terms, privacy) pages [from scratch]
    4. Fix toast rendering [too fast rendering]
    5. Fix the below listed issues as [file, severity, number of issues]
        frontend/src/app/chat/[conversationId]/page.tsx, 2/3, 8
        frontend/src/app/groups/[groupId]/chat/page.tsx, 2/3, 6
        frontend/src/app/profile/[rollNo]/page.tsx, 3/3, 1
        frontend/src/components/MessageBubble.tsx, 2/3, 2
        frontend/src/utils/e2ee.utils.ts, 3/3, 10
        frontend/package.json, 1/3, 1

