# IBM AppID in your Kube Applications with your own Landing Page and a Custom Login Button

## Introduction

Greetings!

I've been playing around with the AppID IKS ingress annotation, and was very happy to see it work as advertised, without any code changes on my part.

One thing it doesn't support, however, is the ability to have my own application landing page with my own login button.  To do that, I need to use the APIs which I am both too lazy to use, and can also be a tad unwieldy.  Fortunately, I figured out a way to get a login button and not have to do much in the application code to support it. 

This repository includes a working sample you can use as a base to incorporate into your own applications.  

`This sample is provided for demo purposes only, without warranty or guarantees, and must pass your own security assessment before attempting in production.`

## Step 1 - Provision the AppID Service and Add Some Users

Find the AppID service in the IBM Cloud catalogue and provision into your account.  Once provisioned, initiate the service and enable the cloud directory:

![alt text](https://github.com/robomeister/appid-sample/blob/master/images/appid1.png)

Now add a user or two:

![alt text](https://github.com/robomeister/appid-sample/blob/master/images/appid2.png)

## Step 2 - Pull the AppID Service Secret into your namespace:

To enable your application to bind to the AppID service, you will need to import the AppID service secret into your cluster:

```
ibmcloud ks cluster-service-bind --cluster <ClusterName> --namespace default --service <AppIDServiceName>
```
Replace `<ClusterName>` with the name of the Kube cluster where the demo will run and replace `<AppIDServiceName>` with the name of your AppID service.

Now you can check:

```
[root@jumpserver]# kubectl get secrets | grep binding
binding-appid                  Opaque                                1      6d21h
[root@jumpserver]#
```
In your environment, the secret name will be `binding-<appidservicename>`.  You will use this secret name in Steps 4 and 5.
  
## Step 3 - Build your Container Image

After pulling this repository down into your environment, build the image directly into your IBM Cloud image repository:

```
 ibmcloud cr build -t us.icr.io/<namespace>/appidsample:1 .
```
Where `<namespace>` is one of your container registry namespaces (you many also need to update the registry location, depending on which region your registry is in).


## Step 4 - Deploy the application

In the `yaml` subdirectory of this repository there is a deployment.yaml file.  Before you deploy the application with it, you will need to make two changes.

```
- On line 20, change the image namespace from `us.icr.io/<namespace>/appidsample:1` to whatever namespace you built the image to.
- On line 27, change `binding-<APPIDSERVICENAME>` to the AppID secret name that we pulled in Step 2.
```

After you make these changes, deploy the application by typing `kubectl create -f ./deployment.yaml`

Check to make sure the pod is up and running:

```
[root@jumpserver appid-sample]# kubectl get pods | grep appid
appidsample-6c5c4f4d6f-vt42g                1/1     Running   0          32h
[root@jumpserver appid-sample]#
```

## Step 5 - Deploy the service

In the `yaml` subdirectory, create the service with `kubectl create -f ./service.yaml`.  No changes to the yaml file is required.

When you check the service, you will actually see two services:

```
[root@jumpserver appid-sample]# kubectl get services | grep appid
appidsample-insecure            ClusterIP      172.21.39.185    <none>           3000/TCP                        41h
appidsample-secure              ClusterIP      172.21.183.48    <none>           3000/TCP                        41h
[root@jumpserver appid-sample]#
```

## Step 6 - Discover your SSL Secret and Ingress Subdomain

AppID only works on web applications locked down with SSL and a fully qualified domain name.  IKS and OpenShift clusters on IBM Cloud have a default wildcard certificate and secret you can use, as well as an Ingress subdomain to add to your application host name.

If you are running an IKS cluster, type the following CLI command:

```
ibmcloud ks cluster get --cluster <clustername> | grep Ingress
```

Alternatively, if you are running an OpenShift cluster, type the following:

```
ibmcloud oc cluster get --cluster <clustername> | grep Ingress
```

In both cases you will see something like the following:

```
Ingress Subdomain:              <YOUR INGRESS SUBDOMAIN>
Ingress Secret:                 <YOUR INGRESS SECRET>
```

We will use `<YOUR INGRESS SUBDOMAIN>` to make up the domain part of your application hostname, and `<YOUR INGRESS SECRET>` as the secret name.


## Step 7 - Deploy the ingress

Now let's have a look at the `ingress.yaml` file in the `yaml` subdirectory:

```
apiVersion: extensions/v1beta1
kind: Ingress
metadata:
  name: appidsample
  annotations:
    ingress.bluemix.net/appid-auth: bindSecret=binding-<APPIDSERVICENAME> namespace=default requestType=web serviceName=appidsample-secure
    ingress.bluemix.net/redirect-to-https: "True"
spec:
  rules:
  - host: appidsample.<YOUR INGRESS SUBDOMAIN>
    http:
      paths:
      - backend:
          serviceName: appidsample-secure
          servicePort: 3000
        path: /secure
      - backend:
          serviceName: appidsample-insecure
          servicePort: 3000
        path: /
  tls:
  - hosts:
    - appidsample.<YOUR INGRESS SUBDOMAIN>
    secretName: <YOUR INGRESS SECRET>
```

The AppID ingress annotation will intercept all traffic heading to the `appidsample-secure` service, defined as path `/secure`.  All other traffic will be serviced by the `appidsample-insecure` service.  That's why we defined two services.

Before deploying do the following: 
```
- change `binding-<APPIDSERVICENAME>` on line 6 to the AppID binding we pulled in Step 2, 
- change lines 10 and 23 to your fully qualified domain name
- change `secretName` on line 24 to the name of the secret we discovered in step 6.
```

After updating the file, deploy the ingress with `kubectl create -f ./ingress.yaml`

Checking your ingress, you should see something like the following:

```
[root@jumpserver appid-sample]# kubectl get ingress | grep appid
appidsample        appidsample.<YOUR INGRESS SUBDOMAIN>    169.48.5.14   80, 443   41h
[root@jumpserver appid-sample]#
```

## Step 8 - Add the Callback URL to AppID

You need to register your application with your AppID instance.  You do this by adding a unique IKS URL to your AppID config.

Go back to your AppID instance and select Manage Authentication-->Authentication Settings:

![alt text](https://github.com/robomeister/appid-sample/blob/master/images/appid6.png)


Add the following web redirect URLs to the configuration, substituting in your fully qualfied hostname:

```
https://appidsample.<YOUR INGRESS SUBDOMAIN>/secure/appid_callback 
https://appidsample.<YOUR INGRESS SUBDOMAIN>/secure/appid_logout
```

## Step 9 - Test the application

At this point you should be able to surf to the application using the ingress host name:

![alt text](https://github.com/robomeister/appid-sample/blob/master/images/appid4.png)

When you press the `Login` button, you should be redirected to the AppID login page.  After providing your credentials, you should be redirected back to the application, with your user information from AppID dumped to the screen:

![alt text](https://github.com/robomeister/appid-sample/blob/master/images/appid5.png)

Pressing the `Logout` button will log you out of the service.


## Notes

If you take a look at the server code, you will see that all secure operations hang off the `/secure` URL:

![alt text](https://github.com/robomeister/appid-sample/blob/master/images/appid7.png)

Everything hanging off `/secure` will be intercepted by AppID and checked to see if you are logged in and have access to the service.  The resulting call on the server side will contain an `Authorization` header in the request bearing the identity token of the logged in user.  The above sample code uses that token to retreive the client details from AppID.

To log out, IKS also supports an AppID logout URL. However, it always forces a redirect back to the AppID login page.  To avoid this, I added a server side logout function to remove the AppID cookies from the browser:

![alt text](https://github.com/robomeister/appid-sample/blob/master/images/appid8.png)

On the client side, the Javascript to perform logout looks like this:

![alt text](https://github.com/robomeister/appid-sample/blob/master/images/appid9.png)

Note the code comments.  If you have just enabled cloud directory, then you are fine.  However, if you have enabled a SAML provider and want to ensure your credentials are cleared there as well, you need to redirect the browser to the supplied `logout.html`.

This file uses a hidden frame to call the SAML provider secretly to remove your credentials:

![alt text](https://github.com/robomeister/appid-sample/blob/master/images/appid10.png)

You will need to change the URL on line 52 to the correct logout URL for your SAML provider.  

Good hunting!


