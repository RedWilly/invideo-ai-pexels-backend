import { Elysia, t } from 'elysia';
import { processScript } from './scriptProcessor';

const app = new Elysia()
  .post('/process-script', 
    async ({ body }) => {
      try {
        console.log(`\n🔍 Received script processing request with tag: "${body.tag}"`);
        console.log(`Script length: ${body.script.length} characters`);
        
        const result = await processScript(body.script, body.tag);
        
        console.log(`\n✅ Processing completed successfully:`);
        console.log(`- Total sections: ${result.length}`);
        const totalPoints = result.reduce((sum, section) => sum + section.points.length, 0);
        console.log(`- Total points: ${totalPoints}`);
        console.log(`- Total videos found: ${totalPoints}\n`);
        
        return { success: true, data: result };
      } catch (error) {
        console.error(`\n❌ Error processing script:`, error);
        return { 
          success: false, 
          error: error instanceof Error ? error.message : 'Unknown error' 
        };
      }
    },
    {
      body: t.Object({
        script: t.String(),
        tag: t.String()
      })
    }
  )
  .get('/', () => 'Script Processing API is running')
  .listen(3000);

console.log(`🦊 Script Processing API is running at ${app.server?.hostname}:${app.server?.port}`);