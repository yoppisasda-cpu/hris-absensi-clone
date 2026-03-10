/**
 * AI Skill Mentor for Learning Management System (Phase 38)
 * Suggests learning objectives based on job title
 */

export async function suggestObjectives(jobTitle: string) {
    const title = jobTitle.toLowerCase();
    
    // Skill Database Simulation
    const skillMap: Record<string, { title: string, category: string, description: string }[]> = {
        'developer': [
            { title: 'Mastering Advanced TypeScript', category: 'Technical', description: 'Deep dive into generics, utility types, and advanced patterns.' },
            { title: 'Clean Code Principles', category: 'Technical', description: 'Implementing SOLID and DRY principles in daily tasks.' },
            { title: 'System Design Fundamentals', category: 'Technical', description: 'Understanding scalability, load balancing, and microservices.' }
        ],
        'frontend': [
            { title: 'Next.js 14 App Router', category: 'Technical', description: 'Learning Server Components and advanced routing.' },
            { title: 'Tailwind CSS Mastery', category: 'Technical', description: 'Building complex UI layouts efficiently.' },
            { title: 'Web Performance Optimization', category: 'Technical', description: 'Improving Core Web Vitals and loading speed.' }
        ],
        'backend': [
            { title: 'Prisma ORM Advanced', category: 'Technical', description: 'Mastering complex migrations and multi-tenancy.' },
            { title: 'Docker & Kubernetes', category: 'Technical', description: 'Containerizing applications and orchestration.' },
            { title: 'API Security Best Practices', category: 'Technical', description: 'Implementing OAuth2, JWT, and rate limiting.' }
        ],
        'manager': [
            { title: 'Strategic Leadership', category: 'Leadership', description: 'Setting vision and goals for the team.' },
            { title: 'Conflict Resolution', category: 'Soft Skill', description: 'Handling disputes and maintaining team harmony.' },
            { title: 'Effective Delegation', category: 'Management', description: 'Assigning tasks based on strengths and monitoring.' }
        ],
        'staff': [
            { title: 'Time Management Mastery', category: 'Soft Skill', description: 'Prioritizing tasks and using tools like Pomodoro.' },
            { title: 'Professional Communication', category: 'Soft Skill', description: 'Improving email etiquette and presentation skills.' }
        ]
    };

    // Find matches
    let recommendations: { title: string, category: string, description: string }[] = [];
    
    for (const key in skillMap) {
        if (title.includes(key)) {
            recommendations = [...recommendations, ...skillMap[key]];
        }
    }

    // Default if no match
    if (recommendations.length === 0) {
        recommendations = [
            { title: 'Growth Mindset', category: 'Soft Skill', description: 'Developing a lifelong learning attitude.' },
            { title: 'Digital Productivity Tools', category: 'Technical', description: 'Mastering Excel, Notion, or ChatGPT for work.' }
        ];
    }

    // Limit to 3 random recommendations
    return recommendations.sort(() => 0.5 - Math.random()).slice(0, 3);
}
