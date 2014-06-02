
TESTS = $(shell find test/ -name '*.test.js')
DOCS_ = $(shell find lib/ -name '*.js')
DOCS = $(DOCS_:.js=.json)
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

gendocs: $(DOCFILE)

$(DOCFILE): $(DOCS)
	node website.js

%.json: %.js
	@echo "\n### $(patsubst lib//%,lib/%, $^)" >> $(DOCFILE)
	./node_modules/dox/bin/dox < $^ >> $(DOCFILE)

.PHONY: test