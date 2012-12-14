
TESTS = $(shell find test/ -name '*.test.js')

test:
	@time ./node_modules/.bin/mocha $(T) --async-only $(TESTS)

bench:
	@time node ./benchmark/run.js

.PHONY: test