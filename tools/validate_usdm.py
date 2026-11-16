"""Validate USDM v4 files with the DDF conformance rules of the usdm4 reference library.

    python3 -m venv .venv && .venv/bin/pip install --no-deps usdm4 \
      && .venv/bin/pip install simple_error_log python-dateutil pyyaml pydantic jsonschema lxml beautifulsoup4 platformdirs requests
    npm test                                   # writes tests/fixtures/*-usdm.json
    .venv/bin/python tools/validate_usdm.py tests/fixtures/*-usdm.json

Runs the d4k engine (the V4 DDF rule catalogue); the CDISC CORE engine is not needed.
"""
import sys, collections
from usdm4 import USDM4

worst = 0
for path in sys.argv[1:]:
    result = USDM4().validate(path).to_dict()
    items = result if isinstance(result, list) else result.get('results', [])
    fails = [x for x in items if isinstance(x, dict) and x.get('status') not in ('Success', 'Not Implemented', 'Passed')]
    errors = [x for x in fails if x.get('level') == 'Error']
    worst = max(worst, len(errors))
    print(f'{path}: {len(errors)} errors, {len(fails) - len(errors)} warnings')
    for (rule, level), n in sorted(collections.Counter((x['rule_id'], x.get('level')) for x in fails).items()):
        print(f'  {rule} {level} x{n}')
sys.exit(1 if worst else 0)
