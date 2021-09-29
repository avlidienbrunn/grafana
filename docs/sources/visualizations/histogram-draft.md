+++
title = "Visualize Histograms in Grafana"
description = "Histogram visualization"
keywords = ["grafana", "docs", "bar chart", "panel", "prometheus"]
weight = 605
+++
---

This section provides detailed information on using histograms and constructing queries to find the number of files based on file size and bucket distribution over time.

# Visualize Prometheus data in Grafana

Histogram visualization provides a graphical representation of the distribution of numerical data. This topic explains how to visualize **Prometheus** data as a histogram in Grafana. For more on this topic, please see [Introduction to histograms and heatmaps](https://grafana.com/docs/grafana/latest/basics/intro-histograms/) and [Prometheus Best Practices: Histograms and summaries](https://prometheus.io/docs/practices/histograms/#apdex-score).

Before you begin, you should have a basic understanding of [Prometheus](https://grafana.com/oss/prometheus/) and Grafana. This documentation will refer to histograms from the perspective of [Grafana 7.0](https://grafana.com/blog/2020/05/18/grafana-v7.0-released-new-plugin-architecture-visualizations-transformations-native-trace-support-and-more/), though later versions of Grafana are also available.

It's more straightforward to understand visualizing histograms with an example. Here, we'll use data sampling from a fictional image hosting service where you can query based on file size.

Key assumptions about this sample data:

- The Prometheus data does not contain any relevant resets and does not require joining metrics.

- Only positive numeric values are included. As a result, `_sum` can be used as a counter. Note that it is possible to have negative values, but they are not used in this example.

- The Go Prometheus client uses scientific notation for large numbers. This sample does not, which causes the screenshots to be slightly off as they are provided only for illustrative purposes. The principle is, however, the same.

A Prometheus histogram consists of three elements:

- **`_count`.** Counts the number of samples
- **`_sum`.** Sums up the value of all samples
- **`_bucket`.** Used to show a set of multiple buckets with a label `le` which contains a cumulative count of samples whose value are less than or equal to the numeric value contained in the `le` label

Our sample data image hosting site receives pictures ranging in size from a few bytes to a few megabytes. The buckets are set up in an exponential scale between 64 bytes and 16MB (so each bucket represents four times the size of the previous bucket).

```bash
uploaded_image_bytes_bucket{le="64"}
uploaded_image_bytes_bucket{le="256"}
uploaded_image_bytes_bucket{le="1024"}
uploaded_image_bytes_bucket{le="4096"}
uploaded_image_bytes_bucket{le="16384"}
uploaded_image_bytes_bucket{le="65536"}
uploaded_image_bytes_bucket{le="262144"}
uploaded_image_bytes_bucket{le="1048576"}
uploaded_image_bytes_bucket{le="4194304"}
uploaded_image_bytes_bucket{le="16777216"}
uploaded_image_bytes_bucket{le="+Inf"}
uploaded_image_bytes_total
uploaded_image_bytes_count
```

For the example, a log-normal distribution is generated between the buckets, where the 64KB and 256KB buckets contain almost the same amount of values where the median is near 64KB. The buckets surrounding those will gradually decrease in size.

## How to use query based on file size

| Size                         | Query                          |       Parameters       | Description  |
|:----------------------------:|:-----------------------------------------------------------------|-------------------------------|------------------------------------------------:|
| `less than (or equal to) 1MB` |   `uploaded_image_bytes_bucket{le="1048576"}`                                                         |       number of files less than (or equal to) 1MB       | The number of files less than (or equal to) 1MB that have been uploaded is stored in the time series database. Additional functions are not needed. Due to Prometheus storing buckets cumulatively, you do not need to use helper functions. The operation then only needs to look at one number when doing a simple query rather than being error-prone and complex if you needed to add the sum of buckets manually.          |
| `smaller than 1MB`            |   `uploaded_image_bytes_bucket{le="1048576"} / ignoring (le) uploaded_image_bytes_count`              |       number of files less than (or equal to) 1MB, total number of files       | The total count of files. Total count for a histogram can be found using either `uploaded_image_bytes_count` or `uploaded_image_bytes_bucket{le="+Inf"}`. Divide the number of files smaller than 1MB by the total number of files to get a ratio between the two. Since the normal way of displaying ratios is as percentages, set the unit to `Percent (0.0-1.0)`.|
| `larger than 1MB`             |   `uploaded_image_bytes_count - ignoring(le) uploaded_image_bytes_bucket{le="1048576"}`               |       number of smaller files, number of total files       | Subtract the number of smaller files from the number of total files to get the number of larger files.  |  
| `between 256KB and 1MB`       |   `uploaded_image_bytes_bucket{le="1048576"} - ignoring(le) uploaded_image_bytes_bucket{le="262144"}` |       number or files between any two bucket boundaries       | Using the same logic as for the previous query, get the number of files between any two bucket boundaries by subtracting the smaller boundary from the larger.  |
| `approximation using PromQL`  |   `histogram_quantile(0.75, uploaded_image_bytes_bucket)`                                             |       ratio, buckets       | The function takes a ratio and the histogram’s buckets as input and returns an approximation of the value at the point of the ratio’s quantile. |

You can use one of the following **panels** to visualize their query:

- **Stat.** Shows the summary of a single series; displays only one metric per panel
- **Gauge.** Also known as a speedometer; best used when the data had defined boundary limits to warn users when they are falling under the normal range
- **Graph.** Time charts that display data points over a time axis allowing users to overlap metrics to compare them overtime; easily modified and good for tracking outliers, state changes, or triggers

This sample query is best represented using a stat if users want to see files they currently have as opposed to over time (which is better shown as a graph). A gauge would not be feasible without a defined range.

## Using PromQL to approximate

We cannot get an accurate value of what size is a quarter of the files smaller than, but we can get an approximation by using PromQL’s `histogram_quantile` function.

The function returns an approximation somewhere in the correct bucket based on our knowledge of exactly how many values are above a particular bucket and how many values are below it.

If the approximated value is larger than the largest bucket (excluding the `+Inf` bucket), Prometheus will give up and give you the value of the largest bucket’s `le` back.

We can then make our approximation of the third quartile with the following query:

```bash
histogram_quantile(0.75, uploaded_image_bytes_bucket)
```

**Note:** When talking about service level, the precision of quantile estimations is relevant. Historically, a lot of services are defined as something like “the p95 latency may not exceed 0.25 seconds.” Assuming we have a bucket for `le=0.25`, we *can* accurately answer whether or not the p95 latency does exceed 0.25 or not.

However, since the p95 value is approximated, we cannot tell definitively if p95 is, say, 0.22 or 0.24 without a bucket in between the two. A way of phrasing this requirement so we do get an accurate number of how close we are to violating our service level is “the proportion of requests in which latency exceeds 0.25 seconds must be less than 5 percent.” Instead of approximating the p95 and seeing if it’s below or above 0.25 seconds, we precisely define the percentage of requests exceeding 0.25 seconds using the methods from above.

## Buckets' distribution

When users create a **bar gauge** panel to visualize `uploaded_image_bytes_bucket` and set the label to `{{le}}`, they will notice the following:

- The values may be inaccurate because *Mean* is the default calculation the bar gauge performs on the data it receives. Under the **Panel > Display > Value** option, change this to *Last* for the correct value.
- The buckets are out of order because they are being ordered alphabetically rather than numerically (i.e. 10 is smaller than 2, since 1 is smaller than 2).
- The cumulative nature of the histogram, as every bucket contains more elements than the previous.

The option to change the **format** of the Prometheus data from `Time series` to `Heatmap` allows users to tell Grafana it is working with a histogram </em>and</em> they would like to sort the buckets to only show distinctive counts for each bucket.

## Buckets' distribution over time

Since a bar gauge does not contain any temporal data, users must use a **Heatmap** to see the same visualization over time. After switching the panel type to **Heatmap**, the following adjustments are required to display it properly:

- Change the **Panel > Axes > Data Format > Format** option from *Time series* to *Time series buckets* as buckets are pre-defined.
- Slightly change the query to show the increase per histogram block rather than the total count of the bucket. The new query is `sum(increase(image_uploaded_bytes_bucket[$__interval])) by (le)`. When users have a temporal dimension in their visualization, they must make sure the query takes advantage of that.
- Set **Query options > Max data points** to 25 to avoid slowing down the browser.

You can use either `rate` or `increase`, selecting the one that makes the most sense for their application. To know *how fast* something is happening, use `rate`. To know *how much* something is happening, use `increase`.