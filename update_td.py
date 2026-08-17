import json
with open('td.json','r',encoding='utf-8') as f:
    data = json.load(f)
if 'taskDefinition' in data:
    td = data['taskDefinition']
else:
    td = data
for k in ['revision','status','requiresAttributes','compatibilities','registeredAt','registeredBy','taskDefinitionArn']:
    td.pop(k,None)
# find gateway container (fallback to first)
container = None
for c in td.get('containerDefinitions',[]):
    if c.get('name') == 'gateway':
        container = c
        break
if not container and td.get('containerDefinitions'):
    container = td['containerDefinitions'][0]
# ensure environment list exists
env = container.get('environment', [])
found = False
for e in env:
    if e.get('name') == 'SPRING_PROFILES_ACTIVE':
        e['value'] = 'dev'
        found = True
        break
if not found:
    env.append({'name':'SPRING_PROFILES_ACTIVE','value':'dev'})
container['environment'] = env
# prepare payload
payload = {
    'family': td.get('family'),
    'taskRoleArn': td.get('taskRoleArn'),
    'executionRoleArn': td.get('executionRoleArn'),
    'networkMode': td.get('networkMode'),
    'containerDefinitions': td.get('containerDefinitions'),
    'volumes': td.get('volumes', []),
    'placementConstraints': td.get('placementConstraints', []),
    'requiresCompatibilities': td.get('requiresCompatibilities', [])
}
if 'cpu' in td: payload['cpu'] = td['cpu']
if 'memory' in td: payload['memory'] = td['memory']
with open('new-taskdef.json','w',encoding='utf-8') as out:
    json.dump(payload,out,indent=2)
print('WROTE new-taskdef.json')
