# How to contribute

Thank you for contributing to the FIWARE Step-by-Step Tutorials

## Testing

To test your changes run:

```console
npm install -C ./app
npm test -C ./app
```

This will check the text for obvious typos, informal grammar and dead links

## Submitting changes

Please send a [GitHub Pull Request](https://github.com/FIWARE/tutorials.NGSI-LD/pull/new/master) with a clear list of
what you've done (read more about [pull requests](https://help.github.com/en/articles/about-pull-requests). Please
follow our coding conventions (below) and make sure all of your commits are atomic (one feature per commit).

Always write a clear log message for your commits. One-line messages are fine for small changes, but bigger changes
should look like this:

```console
$ git commit -m "A brief summary of the commit
>
> A paragraph describing what changed and its impact."
```

Separate Pull requests should be raised for code and documentation changes since code changes (including updates to
`docker-compose` or `services`) require more in-depth testing, and text changes can be landed more quickly

## Coding conventions

The code and Markdown files are formatted by [prettier](https://prettier.io), you can also run the formatter directly:

```console
npm run prettier -C ./app
npm run prettier:text -C ./app
```

Start reading our code and documentation and you'll get the hang of it:

-   Start with appropriate badges and an introductory paragraph
-   Create a **three level** ToC using `markdown-toc`
-   No headings below `###`
-   4th Level headings are **reserved** for `#### Request` and `#### Response` only
-   Every cUrl request should be numbered
    -   Use emoji numbers in the `README.md` of each individual tutorial
    -   Use plain text numbers in `docs/*.md` used for the ReadtheDocs rendering
-   Each tutorial follows a standard pattern - some sections are mandatory:
    -   _Architecture_ - include a reference diagram
    -   _Prerequisites_ (`README.md` only - remove from `docs/*.md` )
    -   _Start Up_
-   Where possible group API calls thematically, switching between two APIs doesn't help the flow of the learning
    material
-   Use a formal writing style, use direct verbs and avoid apostrophes, when in doubt follow Chicago Manual of Style
    conventions.
-   PRs do not need to update the Postman collection, this can be done after the code has landed
