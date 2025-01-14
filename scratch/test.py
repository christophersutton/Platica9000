import spacy
from collections import defaultdict

nlp = spacy.load("en_core_web_sm")

standup = """Daily Standup Minutes
Date: January 18, 2025
Time: 9:01 AM - 9:14 AM
Attendees
Alex Kim, Maya Patel, James Wilson, Riley Chen
Individual Updates
Alex Kim
Completed error handling implementation
Review scheduled for Monday
Next: Prepare for review
Maya Patel
Optimization changes implemented
Initial testing shows 70% performance improvement
Next: Add monitoring for batch operations
James Wilson
Migration runbook approved by ops
Created checklist for migration day
Next: Schedule migration window
Riley Chen
Got clarity on export requirements
Started CSV export implementation
Next: Complete export feature
Notable Discussions
Migration scheduled for next Wednesday
Team lunch planned for Maya's work anniversary
Everyone completed quarterly goals
Action Items
Team: Final review of migration plan [Due: Tuesday]
Maya: Document performance improvements [Due: Monday]
James: Send migration schedule to stakeholders [Due: Today]"""

doc = nlp(standup)

# Track potential projects and their contexts
projects = defaultdict(list)

# Helper to check if a chunk might be a project
def is_likely_project(chunk):
    # Projects often end in these words
    project_indicators = {'implementation', 'migration', 'system', 'feature', 'plan', 'requirements'}
    # Or start with these
    project_prefixes = {'error', 'performance', 'batch', 'export'}
    
    chunk_text = chunk.text.lower()
    return (
        any(ind in chunk_text for ind in project_indicators) or
        any(chunk_text.startswith(prefix) for prefix in project_prefixes)
    )

# Look at noun chunks in each sentence
for sent in doc.sents:
    sent_doc = nlp(sent.text)
    
    # Find the main action/verb in the sentence
    main_verb = None
    for token in sent_doc:
        if token.pos_ == "VERB":
            main_verb = token.text
            break
    
    # Look at noun chunks
    for chunk in sent_doc.noun_chunks:
        if is_likely_project(chunk):
            # Store context
            projects[chunk.text].append({
                'sentence': sent.text,
                'action': main_verb,
                # Find the person if it's in an update section
                'person': next((token.text for token in sent_doc 
                              if token.ent_type_ == "PERSON"), None)
            })

print("Potential Projects and their mentions:")
for project, mentions in projects.items():
    print(f"\n{project}:")
    for mention in mentions:
        print(f"- {mention['sentence']}")
        if mention['person']:
            print(f"  Owner: {mention['person']}")
        if mention['action']:
            print(f"  Action: {mention['action']}")

print("\n\nGrouped by Person:")
person_projects = defaultdict(set)
for project, mentions in projects.items():
    for mention in mentions:
        if mention['person']:
            person_projects[mention['person']].add(project)

for person, their_projects in person_projects.items():
    print(f"\n{person}:")
    for proj in their_projects:
        print(f"- {proj}")