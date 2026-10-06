const fs = require('fs');
let content = fs.readFileSync('backend/src/features/auth/auth.services.js', 'utf8');

// Find the acceptInvitation block
const acceptStart = content.indexOf('async acceptInvitation(rawToken');
const acceptEnd = content.indexOf('async acceptInvitationWithSSO(');

if (acceptStart === -1 || acceptEnd === -1) {
  console.log("Error: could not find acceptInvitation bounds");
  process.exit(1);
}

let acceptBlock = content.substring(acceptStart, acceptEnd);

// Replace the transaction end logic
acceptBlock = acceptBlock.replace(
  `        await session.commitTransaction();

        // Broadcast events OUTSIDE transaction to avoid blocking`,
  `        if (!externalSession) {
          await session.commitTransaction();
        }

        // Broadcast events OUTSIDE transaction to avoid blocking`
);

acceptBlock = acceptBlock.replace(
  `      } catch (error) {
        await session.abortTransaction();
        throw error;
      } finally {
        await session.endSession();
      }`,
  `      } catch (error) {
        if (!externalSession) {
          await session.abortTransaction();
        }
        throw error;
      } finally {
        if (!externalSession) {
          await session.endSession();
        }
      }`
);

content = content.substring(0, acceptStart) + acceptBlock + content.substring(acceptEnd);
fs.writeFileSync('backend/src/features/auth/auth.services.js', content);
