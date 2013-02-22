
TESTS = $(shell find test/ -name '*.test.js')
BROWSERIFY = browserify
all: build build-dev

test:
	@time ./node_modules/.bin/mocha $(T) --async-only $(TESTS)

bench:
	@time node ./benchmark/run.js
build:
	mkdir -p dist
	$(BROWSERIFY) browser.js -o dist/pipeline.js
build-dev:
	mkdir -p dist
	$(BROWSERIFY) browser.js --debug -o dist/pipeline.dev.js

.PHONY: test