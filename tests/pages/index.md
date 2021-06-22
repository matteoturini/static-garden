# H1

## H2 (hover for test)

### H3

#### H4

##### H5

###### H6

[static file test](/test.txt "Test Link")

![image test](example.png "Title")

```scss
h1 { content: "Not injected!" }
```


```css
h1 { color: red; }
```


```scss
/* sg!include */
h2 { color: green; &:hover { color: purple; } }
```


```css
/* sg!include */
h1 { color: blue; }
```


```js
Regular code block (no injection)
```


```js
/* sg!include */
alert("Injected JS");
```
