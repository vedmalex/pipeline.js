
TESTS = $(shell find test/ -name '*.test.js')

BROWSERIFY = browserify
all: build build-dev

test:
	@time ./node_modules/.bin/mocha $(T) $(TESTS)

test-dbg:
	@time ./node_modules/.bin/mocha $(T) -t 1000000 --debug-brk --async-only $(TESTS)

bench:
	@time node ./benchmark/run.js

build:
	mkdir -p dist
	$(BROWSERIFY) browser.js -o dist/pipeline.js

build-dev:
	mkdir -p dist
	$(BROWSERIFY) browser.js --debug -o dist/pipeline.dev.js
 
coverage:
	rm -rf lib-cov
	jscoverage lib lib-cov
	COVERAGE=1 ./node_modules/.bin/mocha -R html-cov $(TESTS) > coverage.html

docs: docclean gendocs

gendocs:
	./node_modules/doxx/bin/doxx --source lib --target docs

docclean:
	rm -f ./docs/*

.PHONY: test